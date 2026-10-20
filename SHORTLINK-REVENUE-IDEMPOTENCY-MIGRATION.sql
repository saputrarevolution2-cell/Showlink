-- ShowLink Shortlink revenue integrity fix.
-- Run after SHORTLINK-SUPABASE-MIGRATION.sql, SUPABASE_FINAL.sql,
-- ADMIN-CONTROL-CENTER-V23-MIGRATION.sql and SHORTLINK-FINAL-ANALYTICS-MIGRATION.sql.
-- This makes event retries idempotent and credits valid GO earnings to pending wallet balance.

-- Public lookup must be read-only: repeated calls to load page data must not inflate views.
CREATE OR REPLACE FUNCTION public.get_shortlink_public(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.shortlinks%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.shortlinks WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'slug', v.slug,
    'title', v.title,
    'content_url', coalesce(v.content_url, v.destination_url),
    'access_price', coalesce(v.access_price, 0),
    'free_enabled', coalesce(v.free_enabled, true)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_shortlink_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shortlink_public(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.shortlink_final_event_receipts (
  event_id uuid PRIMARY KEY,
  shortlink_id uuid NOT NULL REFERENCES public.shortlinks(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','click','redirect')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shortlink_final_receipts_owner_idx
  ON public.shortlink_final_event_receipts(owner_id, created_at DESC);
ALTER TABLE public.shortlink_final_event_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shortlink_final_event_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_shortlink_final_event(
  p_slug text,
  p_event text,
  p_event_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.shortlinks%ROWTYPE;
  v_cpm numeric := 0;
  v_revenue numeric(18,2) := 0;
  v_receipt uuid;
  v_pending_before numeric(18,2) := 0;
  v_pending_after numeric(18,2) := 0;
  v_day date := (timezone('utc', now()))::date;
BEGIN
  IF p_event NOT IN ('view','click','redirect') THEN RAISE EXCEPTION 'INVALID_SHORTLINK_FINAL_EVENT'; END IF;
  IF p_event_id IS NULL THEN RAISE EXCEPTION 'EVENT_ID_REQUIRED'; END IF;

  SELECT * INTO v_link FROM public.shortlinks WHERE slug = p_slug FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHORTLINK_NOT_FOUND'; END IF;

  -- A receipt is claimed once. Retrying the same browser request cannot double-count or double-credit.
  INSERT INTO public.shortlink_final_event_receipts(event_id, shortlink_id, owner_id, event_type)
  VALUES (p_event_id, v_link.id, v_link.owner_id, p_event)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id INTO v_receipt;

  IF v_receipt IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'event', p_event, 'revenue', 0);
  END IF;

  IF p_event = 'redirect' THEN
    SELECT coalesce(cpm, 0) INTO v_cpm
      FROM public.showlink_admin_settings
      WHERE id = true
      LIMIT 1;
    v_revenue := round(greatest(coalesce(v_cpm, 0), 0) / 1000.0, 2);
  END IF;

  INSERT INTO public.shortlink_final_analytics_daily
    (shortlink_id, owner_id, slug, event_date, views, clicks, redirects, revenue, updated_at)
  VALUES (
    v_link.id, v_link.owner_id, v_link.slug, v_day,
    CASE WHEN p_event = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_event = 'click' THEN 1 ELSE 0 END,
    CASE WHEN p_event = 'redirect' THEN 1 ELSE 0 END,
    v_revenue, now()
  )
  ON CONFLICT (shortlink_id, event_date) DO UPDATE SET
    views = public.shortlink_final_analytics_daily.views + EXCLUDED.views,
    clicks = public.shortlink_final_analytics_daily.clicks + EXCLUDED.clicks,
    redirects = public.shortlink_final_analytics_daily.redirects + EXCLUDED.redirects,
    revenue = public.shortlink_final_analytics_daily.revenue + EXCLUDED.revenue,
    updated_at = now();

  -- Only GO redirects earn CPM. Credit the same rounded amount to the pending wallet balance.
  IF p_event = 'redirect' AND v_revenue > 0 THEN
    INSERT INTO public.wallets(user_id) VALUES (v_link.owner_id)
      ON CONFLICT (user_id) DO NOTHING;
    SELECT pending_balance INTO v_pending_before
      FROM public.wallets WHERE user_id = v_link.owner_id FOR UPDATE;
    UPDATE public.wallets
      SET pending_balance = pending_balance + v_revenue,
          lifetime_earned = lifetime_earned + v_revenue,
          updated_at = now()
      WHERE user_id = v_link.owner_id
      RETURNING pending_balance INTO v_pending_after;

    UPDATE public.profiles
      SET pending_balance = coalesce(pending_balance, 0) + v_revenue,
          total_earned = coalesce(total_earned, 0) + v_revenue,
          updated_at = now()
      WHERE id = v_link.owner_id;

    INSERT INTO public.wallet_transactions
      (user_id, type, direction, amount, balance_before, balance_after, description, metadata)
    VALUES (
      v_link.owner_id, 'earning', 'credit', v_revenue,
      coalesce(v_pending_before, 0), coalesce(v_pending_after, 0),
      'Shortlink CPM — GO redirect',
      jsonb_build_object('shortlink_id', v_link.id, 'slug', v_link.slug, 'event_id', p_event_id, 'cpm', v_cpm)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'event', p_event, 'revenue', v_revenue, 'cpm', v_cpm);
END;
$$;
REVOKE ALL ON FUNCTION public.record_shortlink_final_event(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shortlink_final_event(text, text, uuid) TO anon, authenticated;

-- Remove public access to the old two-argument function so stale clients cannot call the non-idempotent version.
REVOKE ALL ON FUNCTION public.record_shortlink_final_event(text, text) FROM PUBLIC, anon, authenticated;
