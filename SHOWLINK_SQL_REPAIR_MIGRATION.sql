-- ShowLink SQL Repair Migration — v1
-- Apply AFTER taking a database backup. Intended for an existing ShowLink schema.
-- This migration hardens profile/payment-link writes and aligns checkout settlement.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS content_text text NOT NULL DEFAULT '';
ALTER TABLE public.payment_links ADD COLUMN IF NOT EXISTS content_html text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(18,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_amount numeric(18,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_amount numeric(18,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_plan text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_price_percent numeric(5,2);
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  cashi_enabled boolean NOT NULL DEFAULT true,
  bayargg_enabled boolean NOT NULL DEFAULT true,
  default_gateway text NOT NULL DEFAULT 'cashi' CHECK (default_gateway IN ('cashi','bayargg')),
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00 CHECK (platform_fee_percent BETWEEN 0 AND 100),
  settlement_days integer NOT NULL DEFAULT 2 CHECK (settlement_days BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_gateway_settings ADD COLUMN IF NOT EXISTS cashi_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.payment_gateway_settings ADD COLUMN IF NOT EXISTS bayargg_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.payment_gateway_settings ADD COLUMN IF NOT EXISTS default_gateway text NOT NULL DEFAULT 'cashi';
ALTER TABLE public.payment_gateway_settings ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE public.payment_gateway_settings ADD COLUMN IF NOT EXISTS settlement_days integer NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS public.payment_link_pricing_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  free_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  vip_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  premium_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  guest_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_link_pricing_config ADD COLUMN IF NOT EXISTS free_percent numeric(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE public.payment_link_pricing_config ADD COLUMN IF NOT EXISTS vip_percent numeric(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE public.payment_link_pricing_config ADD COLUMN IF NOT EXISTS premium_percent numeric(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE public.payment_link_pricing_config ADD COLUMN IF NOT EXISTS guest_percent numeric(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE public.payment_link_pricing_config ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE public.payment_link_pricing_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_link_pricing_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_link_pricing_config TO service_role;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_gateway_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.platform_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  withdrawals_open boolean NOT NULL DEFAULT true,
  manual_withdrawals_open boolean NOT NULL DEFAULT true,
  instant_withdrawals_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.platform_controls ADD COLUMN IF NOT EXISTS manual_withdrawals_open boolean NOT NULL DEFAULT true;
ALTER TABLE public.platform_controls ADD COLUMN IF NOT EXISTS instant_withdrawals_open boolean NOT NULL DEFAULT true;
INSERT INTO public.platform_controls(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.platform_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_controls FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_controls TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Do not overwrite existing administrator choices on reruns.
INSERT INTO public.payment_gateway_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.payment_link_pricing_config(id) VALUES(true) ON CONFLICT(id) DO NOTHING;

-- Admin authorization is derived only from the protected database flags.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
  SELECT COALESCE((SELECT is_admin AND NOT is_banned FROM public.profiles WHERE id=auth.uid()), false);
$$;

-- Profiles: authenticated users may update only ordinary profile fields.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (username,auth_email,display_name,avatar_url,bio,country,balance,pending_balance,total_earned,total_withdrawn,created_at,updated_at,plan,is_admin,is_banned)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (username,display_name,avatar_url,bio,country,updated_at) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.showlink_guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.id AND NOT public.is_current_user_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.auth_email IS DISTINCT FROM OLD.auth_email
      OR NEW.balance IS DISTINCT FROM OLD.balance
      OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
      OR NEW.total_earned IS DISTINCT FROM OLD.total_earned
      OR NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn
      OR NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'PROFILE_PROTECTED_FIELDS';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_showlink_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_showlink_guard_profile_update BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.showlink_guard_profile_update();

-- Safely render content_text as text (not executable HTML).
CREATE OR REPLACE FUNCTION public.showlink_safe_content_html(p_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v text;
BEGIN
  v := replace(replace(coalesce(p_text,''), E'\r\n', E'\n'), E'\r', E'\n');
  v := replace(v,'&','&amp;');
  v := replace(v,'<','&lt;');
  v := replace(v,'>','&gt;');
  v := replace(v,'"','&quot;');
  v := replace(v,'''','&#39;');
  RETURN replace(v,E'\n','<br>');
END; $$;
REVOKE ALL ON FUNCTION public.showlink_safe_content_html(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.showlink_guard_payment_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_current_user_admin() THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'PAYMENT_LINK_OWNER_MISMATCH'; END IF;
    IF NEW.price IS NULL OR NEW.price<2000 OR NEW.price>100000 THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
    NEW.sales_count := 0;
    NEW.views := 0;
    NEW.unique_views := 0;
    NEW.content_html := public.showlink_safe_content_html(NEW.content_text);
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'PAYMENT_LINK_OWNER_MISMATCH'; END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.slug IS DISTINCT FROM OLD.slug
      OR NEW.sales_count IS DISTINCT FROM OLD.sales_count OR NEW.views IS DISTINCT FROM OLD.views
      OR NEW.unique_views IS DISTINCT FROM OLD.unique_views OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'PAYMENT_LINK_PROTECTED_FIELDS';
    END IF;
    IF NEW.price IS DISTINCT FROM OLD.price AND (NEW.price IS NULL OR NEW.price<2000 OR NEW.price>100000) THEN
      RAISE EXCEPTION 'INVALID_PRICE';
    END IF;
    IF NEW.status='deleted' AND OLD.status<>'deleted' THEN RAISE EXCEPTION 'USE_DELETE_ACTION'; END IF;
    NEW.content_html := public.showlink_safe_content_html(NEW.content_text);
    NEW.updated_at := now();
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    IF OLD.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'PAYMENT_LINK_OWNER_MISMATCH'; END IF;
    IF OLD.sales_count>0 OR EXISTS (SELECT 1 FROM public.orders WHERE payment_link_id=OLD.id) THEN
      RAISE EXCEPTION 'PAYMENT_LINK_HAS_ORDERS_USE_ARCHIVE';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_showlink_guard_payment_link ON public.payment_links;
CREATE TRIGGER trg_showlink_guard_payment_link BEFORE INSERT OR UPDATE OR DELETE ON public.payment_links
FOR EACH ROW EXECUTE FUNCTION public.showlink_guard_payment_link();

-- Keep direct table access to safe columns only; create links through the validated RPC.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.payment_links FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (owner_id,slug,title,description,thumbnail_url,price,currency,content_html,content_text,status,expires_at,max_sales,sales_count,views,unique_views,success_title,success_message,metadata,published_at,created_at,updated_at)
  ON TABLE public.payment_links FROM PUBLIC, anon, authenticated;
GRANT UPDATE (title,description,thumbnail_url,price,content_html,content_text,status,expires_at,max_sales,success_title,success_message,updated_at)
  ON TABLE public.payment_links TO authenticated;
GRANT DELETE ON TABLE public.payment_links TO authenticated;

DROP POLICY IF EXISTS payment_links_owner_delete ON public.payment_links;
CREATE POLICY payment_links_owner_delete ON public.payment_links FOR DELETE TO authenticated USING (owner_id=auth.uid());

-- Normalize previously stored content so legacy HTML cannot execute scripts.
-- If an old row has no content_text, recover visible text from its markup first.
UPDATE public.payment_links
SET content_text = CASE
      WHEN nullif(trim(content_text),'') IS NULL
        THEN trim(regexp_replace(coalesce(content_html,''), '<[^>]*>', ' ', 'g'))
      ELSE content_text
    END,
    content_html = public.showlink_safe_content_html(CASE
      WHEN nullif(trim(content_text),'') IS NULL
        THEN trim(regexp_replace(coalesce(content_html,''), '<[^>]*>', ' ', 'g'))
      ELSE content_text
    END),
    updated_at=now()
WHERE content_html IS DISTINCT FROM public.showlink_safe_content_html(CASE
        WHEN nullif(trim(content_text),'') IS NULL
          THEN trim(regexp_replace(coalesce(content_html,''), '<[^>]*>', ' ', 'g'))
        ELSE content_text
      END)
   OR (nullif(trim(content_text),'') IS NULL AND nullif(trim(content_html),'') IS NOT NULL);

REVOKE ALL ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_title text,
  p_description text,
  p_price numeric,
  p_content_html text DEFAULT '',
  p_content_text text DEFAULT '',
  p_thumbnail_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_id uuid; v_slug text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_banned=true) THEN RAISE EXCEPTION 'ACCOUNT_BANNED'; END IF;
  IF p_title IS NULL OR length(trim(p_title))=0 THEN RAISE EXCEPTION 'INVALID_TITLE'; END IF;
  IF p_content_text IS NULL OR length(trim(p_content_text))=0 THEN RAISE EXCEPTION 'INVALID_CONTENT'; END IF;
  IF p_price IS NULL OR p_price < 2000 OR p_price > 100000 THEN RAISE EXCEPTION 'INVALID_PRICE: Payment Link price must be between Rp2,000 and Rp100,000'; END IF;
  v_slug := public.showlink_random_slug(6);
  INSERT INTO public.payment_links(owner_id,slug,title,description,price,content_html,content_text,thumbnail_url,status,published_at)
  VALUES(auth.uid(),v_slug,trim(p_title),coalesce(p_description,''),p_price,coalesce(p_content_html,''),coalesce(p_content_text,''),p_thumbnail_url,'active',now())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'slug',v_slug,'url','https://showlink.my.id/p/'||v_slug,'checkout_url','https://showlink.my.id/p/'||v_slug);
END; $$;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_payment_link_id uuid,
  p_guest_access_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.payment_links%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_buyer uuid;
  v_original_amount numeric;
  v_buyer_plan text;
  v_buyer_price_percent numeric;
  v_buyer_amount numeric;
  v_platform_fee_percent numeric;
  v_platform_fee_amount numeric;
  v_seller_amount numeric;
BEGIN
  IF auth.uid() IS NULL
     AND coalesce(trim(p_guest_access_token),'') = '' THEN
    RAISE EXCEPTION 'AUTH_OR_GUEST_TOKEN_REQUIRED';
  END IF;

  SELECT * INTO v_link
  FROM public.payment_links
  WHERE id = p_payment_link_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_sales IS NULL OR sales_count < max_sales);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_LINK_NOT_AVAILABLE';
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_banned=true) THEN
    RAISE EXCEPTION 'ACCOUNT_BANNED';
  END IF;

  v_buyer := auth.uid();

  -- Creator cannot purchase their own Payment Link.
  IF v_buyer IS NOT NULL AND v_buyer = v_link.owner_id THEN
    RAISE EXCEPTION 'CANNOT_BUY_OWN_PAYMENT_LINK';
  END IF;

  -- Logged-in buyers who already have access do not pay again.
  IF v_buyer IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.content_access
    WHERE payment_link_id = v_link.id
      AND buyer_id = v_buyer
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_accessible', true,
      'payment_link_id', v_link.id,
      'amount', 0,
      'currency', v_link.currency,
      'checkout_url', 'https://showlink.my.id/p/' || v_link.slug
    );
  END IF;

  -- Calculate the actual buyer amount before creating the order.
  SELECT
    p.original_amount,
    p.buyer_plan,
    p.buyer_price_percent,
    p.buyer_amount,
    p.platform_fee_percent,
    p.platform_fee_amount,
    p.seller_amount
  INTO
    v_original_amount,
    v_buyer_plan,
    v_buyer_price_percent,
    v_buyer_amount,
    v_platform_fee_percent,
    v_platform_fee_amount,
    v_seller_amount
  FROM public.get_payment_link_buyer_price(v_link.price, v_buyer) p;

  -- Actual checkout amount equals the seller-set Payment Link price.
  -- Payment links themselves require a seller-set price of at least Rp2,000.
  IF v_buyer_amount < 2000 THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_BELOW_MINIMUM: Payment Link minimum is Rp2,000';
  END IF;

  v_order_number := public.showlink_order_number();

  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    payment_link_id,
    order_number,
    item_title,
    amount,
    currency,
    status,
    guest_access_token,
    expires_at,
    original_amount,
    buyer_plan,
    buyer_price_percent,
    platform_fee_percent,
    platform_fee_amount,
    seller_amount
  )
  VALUES (
    v_buyer,
    v_link.owner_id,
    v_link.id,
    v_order_number,
    v_link.title,
    v_buyer_amount,
    v_link.currency,
    'pending',
    NULLIF(trim(p_guest_access_token), ''),
    now() + interval '30 minutes',
    v_original_amount,
    v_buyer_plan,
    v_buyer_price_percent,
    v_platform_fee_percent,
    v_platform_fee_amount,
    v_seller_amount
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_accessible', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'amount', v_buyer_amount,
    'original_amount', v_original_amount,
    'buyer_plan', v_buyer_plan,
    'buyer_price_percent', v_buyer_price_percent,
    'platform_fee_percent', v_platform_fee_percent,
    'platform_fee_amount', v_platform_fee_amount,
    'seller_amount', v_seller_amount,
    'currency', v_link.currency,
    'payment_link_id', v_link.id,
    'checkout_url', 'https://showlink.my.id/p/' || v_link.slug
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_paid_order(
  p_order_id uuid,
  p_provider text DEFAULT NULL,
  p_provider_payment_id text DEFAULT NULL,
  p_provider_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_seller numeric(18,2);
  v_platform numeric(18,2);
  v_platform_percent numeric(5,2);
  v_available_at timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('showlink-payment-link-settlement:'||p_order_id::text,0));
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status IN ('paid','completed') THEN
    UPDATE public.payments SET status='paid',paid_at=coalesce(paid_at,now()),updated_at=now()
    WHERE order_id=v_order.id AND status NOT IN ('refunded','cancelled');
    RETURN jsonb_build_object('ok',true,'already_settled',true,'order_id',v_order.id);
  END IF;
  IF v_order.status IN ('cancelled','failed','refunded') THEN RAISE EXCEPTION 'ORDER_NOT_SETTLEABLE'; END IF;

  SELECT coalesce(v_order.platform_fee_percent, gs.platform_fee_percent, cfg.platform_fee_percent, 20.00)
    INTO v_platform_percent
  FROM (SELECT 1) seed
  LEFT JOIN public.payment_gateway_settings gs ON gs.id=true
  LEFT JOIN public.payment_link_pricing_config cfg ON cfg.id=true;
  v_platform_percent := greatest(0,least(100,coalesce(v_platform_percent,20.00)));
  v_platform := round(v_order.amount*v_platform_percent/100.00,2);
  v_seller := round(v_order.amount-v_platform,2);
  SELECT now() + make_interval(days => coalesce((SELECT settlement_days FROM public.payment_gateway_settings WHERE id=true),2)) INTO v_available_at;

  UPDATE public.orders SET status='paid',paid_at=now(),updated_at=now(),payment_reference=coalesce(payment_reference,p_provider_payment_id),provider=coalesce(p_provider,provider),provider_order_id=coalesce(provider_order_id,p_provider_payment_id),platform_fee_percent=v_platform_percent,platform_fee_amount=v_platform,seller_amount=v_seller,gateway_payload=coalesce(p_provider_payload,'{}'::jsonb) WHERE id=v_order.id;

  UPDATE public.payments
  SET status='paid',paid_at=coalesce(paid_at,now()),provider=coalesce(p_provider,provider),
      provider_payment_id=coalesce(p_provider_payment_id,provider_payment_id),
      provider_payload=coalesce(p_provider_payload,'{}'::jsonb),updated_at=now()
  WHERE order_id=v_order.id AND status NOT IN ('refunded','cancelled');

  INSERT INTO public.order_settlements(order_id,seller_id,gross_amount,payment_fee,seller_amount,platform_amount,status,available_at)
  VALUES(v_order.id,v_order.seller_id,v_order.amount,0,v_seller,v_platform,'held',v_available_at)
  ON CONFLICT(order_id) DO UPDATE SET gross_amount=excluded.gross_amount,seller_amount=excluded.seller_amount,platform_amount=excluded.platform_amount,status='held',available_at=excluded.available_at,updated_at=now();

  INSERT INTO public.platform_earnings(order_id,amount,source,description)
  SELECT v_order.id,v_platform,'payment_link',format('Payment Link platform fee %s%%',v_platform_percent)
  WHERE NOT EXISTS(SELECT 1 FROM public.platform_earnings WHERE order_id=v_order.id);

  IF v_order.seller_id IS NOT NULL THEN
    INSERT INTO public.wallets(user_id) VALUES(v_order.seller_id) ON CONFLICT(user_id) DO NOTHING;
    UPDATE public.wallets SET pending_balance=pending_balance+v_seller,lifetime_earned=lifetime_earned+v_seller,updated_at=now() WHERE user_id=v_order.seller_id;
    UPDATE public.profiles SET pending_balance=pending_balance+v_seller,total_earned=total_earned+v_seller,updated_at=now() WHERE id=v_order.seller_id;
    IF v_seller > 0 THEN
      INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,order_id,description)
      SELECT v_order.seller_id,'earning','credit',v_seller,w.pending_balance-v_seller,w.pending_balance,v_order.id,'Payment Link sale — pending settlement' FROM public.wallets w WHERE w.user_id=v_order.seller_id;
    END IF;
    INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(v_order.seller_id,'order','Pembayaran berhasil',format('Order %s berhasil dibayar. Rp%s masuk saldo pending dan tersedia setelah H+2.',v_order.order_number,to_char(v_seller,'FM999G999G999G990D00')),'/withdraw.html');
  END IF;
  UPDATE public.payment_links SET sales_count=sales_count+1,updated_at=now() WHERE id=v_order.payment_link_id;
  PERFORM public.grant_payment_access(v_order.id);
  RETURN jsonb_build_object('ok',true,'order_id',v_order.id,'settled',true,'gross_amount',v_order.amount,'platform_fee',v_platform,'seller_amount',v_seller,'available_at',v_available_at);
END; $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_method_id uuid,
  p_mode text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  m public.withdrawal_methods%ROWTYPE;
  wid uuid;
  fee numeric;
  total_debit numeric;
  net_amount numeric;
  used_today numeric := 0;
  daily_limit numeric := 500000;
  now_jakarta timestamp;
  minute_of_day integer;
  admin_id uuid;
  account_label text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=uid AND is_banned=true) THEN RAISE EXCEPTION 'ACCOUNT_BANNED'; END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('manual','instant') THEN RAISE EXCEPTION 'INVALID_WITHDRAW_MODE'; END IF;
  -- The admin master switch blocks every withdrawal mode.
  IF NOT COALESCE((SELECT withdrawals_open FROM public.platform_controls WHERE id=true), true) THEN
    RAISE EXCEPTION 'WITHDRAWALS_CLOSED';
  END IF;
  IF p_mode='manual' AND NOT COALESCE((SELECT manual_withdrawals_open FROM public.platform_controls WHERE id=true), true) THEN
    RAISE EXCEPTION 'MANUAL_WITHDRAWAL_DISABLED';
  END IF;
  IF p_mode='instant' AND NOT COALESCE((SELECT instant_withdrawals_open FROM public.platform_controls WHERE id=true), true) THEN
    RAISE EXCEPTION 'INSTANT_WITHDRAWAL_DISABLED';
  END IF;
  PERFORM public.release_due_settlements();

  IF p_amount IS NULL OR p_amount < 10000 THEN RAISE EXCEPTION 'MIN_WITHDRAWAL_10000'; END IF;

  now_jakarta := now() AT TIME ZONE 'Asia/Jakarta';
  minute_of_day := extract(hour from now_jakarta)::integer * 60 + extract(minute from now_jakarta)::integer;

  IF p_mode='manual' THEN
    IF minute_of_day < 480 OR minute_of_day >= 1260 THEN
      RAISE EXCEPTION 'MANUAL_WITHDRAWAL_CLOSED';
    END IF;
    fee := public.showlink_manual_withdraw_fee(p_amount);
  ELSE
    -- Instant is an admin-approved instant request in this version.
    -- A real automatic payout provider can be connected later without changing the fee/account flow.
    IF p_amount NOT IN (50000,100000,150000,200000) THEN
      RAISE EXCEPTION 'INVALID_INSTANT_AMOUNT';
    END IF;
    fee := public.showlink_instant_withdraw_fee(p_amount);
  END IF;

  SELECT * INTO m
  FROM public.withdrawal_methods
  WHERE id=p_method_id AND user_id=uid AND is_active=true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_METHOD_NOT_FOUND'; END IF;

  -- Lock the wallet before calculating today's usage so concurrent requests
  -- from the same user cannot both pass the daily limit check.
  SELECT * INTO w FROM public.wallets WHERE user_id=uid FOR UPDATE;
  total_debit := p_amount;
  IF NOT FOUND OR w.available_balance < total_debit THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE';
  END IF;

  SELECT coalesce(sum(amount),0) INTO used_today
  FROM public.withdrawals
  WHERE user_id=uid
    AND status IN ('pending','processing','paid')
    AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = now_jakarta::date;

  IF used_today + p_amount > daily_limit THEN
    RAISE EXCEPTION 'DAILY_WITHDRAW_LIMIT';
  END IF;

  net_amount := greatest(0,p_amount-fee);
  account_label := coalesce(m.method_type,'-') || ' • ' || coalesce(m.account_number,'-');

  INSERT INTO public.withdrawals(user_id,method_id,amount,fee,net_amount,status,metadata)
  VALUES(
    uid,m.id,p_amount,fee,net_amount,'pending',
    jsonb_build_object(
      'mode',p_mode,
      'total_debit',total_debit,
      'account_name',m.account_name,
      'method_type',m.method_type,
      'account_number',m.account_number,
      'requested_at_jakarta',now_jakarta
    )
  )
  RETURNING id INTO wid;

  UPDATE public.wallets
  SET available_balance=available_balance-total_debit,
      lifetime_withdrawn=lifetime_withdrawn+p_amount,
      updated_at=now()
  WHERE user_id=uid;

  UPDATE public.profiles
  SET balance=greatest(0,balance-total_debit),
      total_withdrawn=total_withdrawn+p_amount,
      updated_at=now()
  WHERE id=uid;

  INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description,metadata)
  VALUES(
    uid,'withdrawal','debit',total_debit,w.available_balance,w.available_balance-total_debit,wid,
    'Withdrawal request + fee',jsonb_build_object('requested_amount',p_amount,'fee',fee,'mode',p_mode)
  );

  INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
  VALUES(
    uid,'withdrawal','Withdrawal diajukan',
    format('Nominal %s • Rekening %s • Fee %s • Total bersih %s. Menunggu persetujuan admin.',
      to_char(p_amount,'FM999G999G999G990D00'),account_label,to_char(fee,'FM999G999G999G990D00'),to_char(net_amount,'FM999G999G999G990D00')),
    '/withdraw.html',jsonb_build_object('withdrawal_id',wid,'status','pending','mode',p_mode,'amount',p_amount,'fee',fee,'total_debit',total_debit)
  );

  -- Notify every current admin so the request appears in the admin notification feed.
  FOR admin_id IN SELECT id FROM public.profiles WHERE is_admin=true LOOP
    INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
    VALUES(
      admin_id,'admin_withdrawal','Withdrawal baru',
      format('Withdrawal %s: %s • Rekening %s • Fee %s • Bersih %s. Menunggu approval.',
        to_char(p_amount,'FM999G999G999G990D00'),p_mode,account_label,to_char(fee,'FM999G999G999G990D00'),to_char(greatest(0,p_amount-fee),'FM999G999G999G990D00')),
      '/admin.html',jsonb_build_object('withdrawal_id',wid,'user_id',uid,'status','pending')
    );
  END LOOP;

  RETURN jsonb_build_object('ok',true,'withdrawal_id',wid,'amount',p_amount,'fee',fee,'net_amount',net_amount,'total_debit',total_debit,'status','pending','mode',p_mode,'daily_used',used_today+p_amount,'daily_limit',daily_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(
  p_withdrawal_id uuid,
  p_status text,
  p_admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  w public.withdrawals%ROWTYPE;
  before_status text;
  total_debit numeric;
  note_text text := nullif(trim(coalesce(p_admin_note,'')), '');
  admin_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('processing','paid','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
  before_status := w.status;
  total_debit := coalesce((w.metadata->>'total_debit')::numeric, w.amount);

  IF before_status IN ('paid','rejected','cancelled') THEN
    RAISE EXCEPTION 'WITHDRAWAL_ALREADY_FINAL';
  END IF;
  IF before_status NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'INVALID_WITHDRAWAL_TRANSITION';
  END IF;

  IF p_status='rejected' AND note_text IS NULL THEN
    RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
  END IF;

  UPDATE public.withdrawals
  SET status=p_status,
      admin_note=coalesce(note_text,admin_note),
      processed_by=admin_uid,
      processed_at=CASE WHEN p_status IN ('paid','rejected','cancelled') THEN now() ELSE processed_at END,
      updated_at=now()
  WHERE id=w.id;

  IF p_status IN ('rejected','cancelled') THEN
    UPDATE public.wallets
    SET available_balance=available_balance+total_debit,
        lifetime_withdrawn=greatest(0,lifetime_withdrawn-w.amount),
        updated_at=now()
    WHERE user_id=w.user_id;
    UPDATE public.profiles
    SET balance=balance+total_debit,
        total_withdrawn=greatest(0,total_withdrawn-w.amount),
        updated_at=now()
    WHERE id=w.user_id;
    INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description,metadata)
    SELECT w.user_id,'reversal','credit',total_debit,wa.available_balance-total_debit,wa.available_balance,w.id,
      'Withdrawal dikembalikan oleh admin',jsonb_build_object('reason',note_text,'requested_amount',w.amount,'fee',w.fee)
    FROM public.wallets wa WHERE wa.user_id=w.user_id;
  END IF;

  IF p_status='paid' THEN
    INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
    VALUES(w.user_id,'withdrawal','Withdrawal berhasil',format('Withdrawal %s berhasil diproses. Nominal %s dikirim ke rekening tujuan.',w.id,to_char(w.amount,'FM999G999G999G990D00')),'/withdraw.html',jsonb_build_object('withdrawal_id',w.id,'status','paid'));
  ELSIF p_status='rejected' THEN
    INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
    VALUES(w.user_id,'withdrawal','Withdrawal ditolak',format('Withdrawal %s ditolak. Alasan: %s. Saldo telah dikembalikan.',w.id,note_text),'/withdraw.html',jsonb_build_object('withdrawal_id',w.id,'status','rejected','reason',note_text));
  ELSIF p_status='processing' THEN
    INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
    VALUES(w.user_id,'withdrawal','Withdrawal diproses',format('Withdrawal %s sedang diproses admin.',w.id),'/withdraw.html',jsonb_build_object('withdrawal_id',w.id,'status','processing'));
  END IF;

  RETURN jsonb_build_object('ok',true,'withdrawal_id',w.id,'status',p_status,'fee',w.fee,'total_debit',total_debit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_gateway_settings(
  p_cashi_enabled boolean,p_bayargg_enabled boolean,p_default_gateway text,
  p_platform_fee_percent numeric,p_settlement_days integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE g public.payment_gateway_settings%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_cashi_enabled IS NULL OR p_bayargg_enabled IS NULL OR NOT (p_cashi_enabled OR p_bayargg_enabled) THEN RAISE EXCEPTION 'AT_LEAST_ONE_GATEWAY_REQUIRED'; END IF;
  IF p_default_gateway IS NULL OR p_default_gateway NOT IN ('cashi','bayargg') THEN RAISE EXCEPTION 'INVALID_GATEWAY'; END IF;
  IF (p_default_gateway='cashi' AND NOT p_cashi_enabled) OR (p_default_gateway='bayargg' AND NOT p_bayargg_enabled) THEN RAISE EXCEPTION 'DEFAULT_GATEWAY_DISABLED'; END IF;
  IF p_platform_fee_percent IS NULL OR p_platform_fee_percent<0 OR p_platform_fee_percent>100 THEN RAISE EXCEPTION 'INVALID_PLATFORM_FEE'; END IF;
  IF p_settlement_days IS NULL OR p_settlement_days<0 OR p_settlement_days>30 THEN RAISE EXCEPTION 'INVALID_SETTLEMENT_DAYS'; END IF;
  UPDATE public.payment_gateway_settings SET cashi_enabled=p_cashi_enabled,bayargg_enabled=p_bayargg_enabled,
    default_gateway=p_default_gateway,platform_fee_percent=p_platform_fee_percent,settlement_days=p_settlement_days,
    updated_at=now() WHERE id=true RETURNING * INTO g;
  UPDATE public.payment_link_pricing_config SET platform_fee_percent=p_platform_fee_percent,updated_at=now() WHERE id=true;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
    VALUES(auth.uid(),'update_gateway_settings','platform',to_jsonb(g));
  RETURN to_jsonb(g);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_payment_link(
  p_link_id uuid,p_title text,p_price numeric,p_status text,p_description text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r public.payment_links%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status NOT IN ('draft','active','paused','expired','deleted') THEN RAISE EXCEPTION 'INVALID_LINK_STATUS'; END IF;
  IF length(trim(coalesce(p_title,'')))<2 OR p_price IS NULL OR p_price<2000 OR p_price>100000 THEN RAISE EXCEPTION 'INVALID_LINK_FIELDS'; END IF;
  UPDATE public.payment_links SET title=trim(p_title),price=p_price,status=p_status,
    description=coalesce(p_description,description),updated_at=now()
  WHERE id=p_link_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'update_payment_link','payment_link',r.id::text,jsonb_build_object('title',r.title,'price',r.price,'status',r.status));
  RETURN jsonb_build_object('ok',true,'id',r.id,'title',r.title,'price',r.price,'status',r.status);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_withdrawals_open(p_open boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_open IS NULL THEN RAISE EXCEPTION 'INVALID_OPEN_STATE'; END IF;
  UPDATE public.platform_controls SET withdrawals_open=p_open,updated_at=now(),updated_by=auth.uid() WHERE id=true;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
  VALUES(auth.uid(),CASE WHEN p_open THEN 'open_withdrawals' ELSE 'close_withdrawals' END,'platform',jsonb_build_object('withdrawals_open',p_open));
  INSERT INTO public.notifications(user_id,type,title,message,link_url)
  SELECT p.id,'system',CASE WHEN p_open THEN 'Withdrawal dibuka kembali' ELSE 'Withdrawal ditutup sementara' END,
    CASE WHEN p_open THEN 'Permintaan withdrawal kini dapat diajukan kembali.' ELSE 'Permintaan withdrawal sedang ditutup sementara oleh admin.' END,'/withdraw.html'
  FROM public.profiles p;
  RETURN jsonb_build_object('ok',true,'withdrawals_open',p_open);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_withdrawal_mode_open(p_mode text,p_open boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('manual','instant') OR p_open IS NULL THEN RAISE EXCEPTION 'INVALID_WITHDRAW_MODE'; END IF;
  IF p_mode='manual' THEN
    UPDATE public.platform_controls SET manual_withdrawals_open=p_open,updated_at=now(),updated_by=auth.uid() WHERE id=true;
  ELSE
    UPDATE public.platform_controls SET instant_withdrawals_open=p_open,updated_at=now(),updated_by=auth.uid() WHERE id=true;
  END IF;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
  VALUES(auth.uid(),CASE WHEN p_open THEN 'open_withdrawal_mode' ELSE 'close_withdrawal_mode' END,'platform',jsonb_build_object('mode',p_mode,'open',p_open));
  RETURN jsonb_build_object('ok',true,'mode',p_mode,'open',p_open);
END; $$;

REVOKE ALL ON FUNCTION public.create_checkout_order(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(uuid,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_paid_order(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_paid_order(uuid,text,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,uuid,text) TO authenticated;
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,uuid);
REVOKE ALL ON FUNCTION public.admin_update_withdrawal(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_payment_link(uuid,text,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_link(uuid,text,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_withdrawals_open(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_withdrawals_open(boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_withdrawal_mode_open(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_withdrawal_mode_open(text,boolean) TO authenticated;

-- RPCs remain admin-only at function level, not merely hidden in the UI.
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

COMMIT;
