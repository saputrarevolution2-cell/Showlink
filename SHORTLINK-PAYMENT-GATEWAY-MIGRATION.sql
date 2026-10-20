-- ShowLink Shortlink paid access: connect Shortlink orders to the existing
-- Cashi / BayarGG Edge Functions and settlement pipeline. Run once in Supabase SQL Editor.
BEGIN;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shortlink_id uuid REFERENCES public.shortlinks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_shortlink_idx ON public.orders(shortlink_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shortlink_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlink_id uuid NOT NULL REFERENCES public.shortlinks(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_access_token text,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'paid' CHECK (access_type='paid'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id IS NOT NULL OR NULLIF(trim(guest_access_token),'') IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS shortlink_access_buyer_uidx ON public.shortlink_access(shortlink_id,buyer_id) WHERE buyer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shortlink_access_guest_uidx ON public.shortlink_access(shortlink_id,guest_access_token) WHERE guest_access_token IS NOT NULL;
ALTER TABLE public.shortlink_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shortlink_access FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shortlink_access TO service_role;

CREATE OR REPLACE FUNCTION public.create_shortlink_checkout_order(
  p_slug text,
  p_guest_access_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  v_link public.shortlinks%ROWTYPE;
  v_order_id uuid;
  v_buyer uuid := auth.uid();
  v_token text := NULLIF(trim(p_guest_access_token),'');
  v_price numeric(18,2);
  v_platform_percent numeric(5,2);
BEGIN
  IF v_buyer IS NULL AND v_token IS NULL THEN RAISE EXCEPTION 'AUTH_OR_GUEST_TOKEN_REQUIRED'; END IF;
  SELECT * INTO v_link FROM public.shortlinks WHERE slug=trim(p_slug);
  IF NOT FOUND THEN RAISE EXCEPTION 'SHORTLINK_NOT_FOUND'; END IF;
  IF v_buyer IS NOT NULL AND v_buyer=v_link.owner_id THEN RAISE EXCEPTION 'CANNOT_BUY_OWN_SHORTLINK'; END IF;
  IF v_buyer IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=v_buyer AND is_banned=true) THEN RAISE EXCEPTION 'ACCOUNT_BANNED'; END IF;
  v_price := round(coalesce(v_link.access_price,0),2);
  IF v_price < 2000 THEN RAISE EXCEPTION 'SHORTLINK_PRICE_MINIMUM_2000'; END IF;
  IF EXISTS (SELECT 1 FROM public.shortlink_access a WHERE a.shortlink_id=v_link.id AND ((v_buyer IS NOT NULL AND a.buyer_id=v_buyer) OR (v_token IS NOT NULL AND a.guest_access_token=v_token))) THEN
    RETURN jsonb_build_object('ok',true,'already_accessible',true,'amount',0,'slug',v_link.slug);
  END IF;
  SELECT coalesce(platform_fee_percent,20.00) INTO v_platform_percent FROM public.payment_gateway_settings WHERE id=true;
  v_platform_percent := greatest(0,least(100,coalesce(v_platform_percent,20.00)));
  INSERT INTO public.orders(buyer_id,seller_id,shortlink_id,order_number,item_title,amount,currency,status,guest_access_token,expires_at,original_amount,platform_fee_percent,platform_fee_amount,seller_amount)
  VALUES(v_buyer,v_link.owner_id,v_link.id,public.showlink_order_number(),coalesce(nullif(trim(v_link.title),''),'Shortlink access'),v_price,'IDR','pending',v_token,now()+interval '30 minutes',v_price,v_platform_percent,round(v_price*v_platform_percent/100,2),round(v_price*(100-v_platform_percent)/100,2))
  RETURNING id INTO v_order_id;
  RETURN jsonb_build_object('ok',true,'already_accessible',false,'order_id',v_order_id,'amount',v_price,'currency','IDR','slug',v_link.slug);
END; $$;
REVOKE ALL ON FUNCTION public.create_shortlink_checkout_order(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_shortlink_checkout_order(text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.grant_payment_access(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status NOT IN ('paid','completed') THEN RAISE EXCEPTION 'ORDER_NOT_PAID'; END IF;
  IF o.shortlink_id IS NOT NULL THEN
    INSERT INTO public.shortlink_access(shortlink_id,buyer_id,guest_access_token,order_id,access_type)
    VALUES(o.shortlink_id,o.buyer_id,NULLIF(trim(o.guest_access_token),''),o.id,'paid')
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;
  IF o.payment_link_id IS NULL THEN RAISE EXCEPTION 'PAYMENT_LINK_MISSING'; END IF;
  INSERT INTO public.content_access(buyer_id,guest_access_token,payment_link_id,order_id,access_type)
  VALUES(o.buyer_id,NULLIF(trim(o.guest_access_token),''),o.payment_link_id,o.id,'paid') ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.grant_payment_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_payment_access(uuid) TO service_role;

-- Keep the existing settlement function; its Payment Link sales_count update is a no-op
-- for shortlink orders (payment_link_id is NULL), and it calls grant_payment_access above.

DROP FUNCTION IF EXISTS public.resolve_shortlink(text);
CREATE OR REPLACE FUNCTION public.resolve_shortlink(p_slug text, p_guest_access_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v public.shortlinks%ROWTYPE; v_uid uuid := auth.uid(); v_token text := NULLIF(trim(p_guest_access_token),''); v_allowed boolean := false;
BEGIN
  SELECT * INTO v FROM public.shortlinks WHERE slug=trim(p_slug);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF coalesce(v.access_price,0) > 0 THEN
    IF v_uid IS NOT NULL AND EXISTS(SELECT 1 FROM public.shortlink_access a WHERE a.shortlink_id=v.id AND a.buyer_id=v_uid) THEN v_allowed:=true; END IF;
    IF NOT v_allowed AND v_token IS NOT NULL AND EXISTS(SELECT 1 FROM public.shortlink_access a WHERE a.shortlink_id=v.id AND a.guest_access_token=v_token) THEN v_allowed:=true; END IF;
    IF NOT v_allowed THEN RETURN jsonb_build_object('payment_required',true,'slug',v.slug,'title',v.title,'access_price',v.access_price); END IF;
  END IF;
  UPDATE public.shortlinks SET clicks=clicks+1,updated_at=now() WHERE id=v.id;
  RETURN jsonb_build_object('destination_url',coalesce(v.content_url,v.destination_url),'slug',v.slug);
END; $$;
REVOKE ALL ON FUNCTION public.resolve_shortlink(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_shortlink(text,text) TO anon,authenticated;
-- Do not disclose the protected destination URL from the public metadata RPC.
CREATE OR REPLACE FUNCTION public.get_shortlink_public(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v public.shortlinks%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.shortlinks WHERE slug=trim(p_slug);
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.shortlinks SET views=views+1 WHERE id=v.id;
  RETURN jsonb_build_object(
    'slug',v.slug,
    'title',v.title,
    'content_url',CASE WHEN coalesce(v.access_price,0)>0 THEN NULL ELSE coalesce(v.content_url,v.destination_url) END,
    'access_price',v.access_price,
    'free_enabled',v.free_enabled
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_shortlink_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shortlink_public(text) TO anon,authenticated;
COMMIT;
