-- ShowLink: component-based withdrawal fees (platform method fee + membership fee).
-- Run after WITHDRAW-FEES-SCHEDULE-MIGRATION.sql in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.showlink_withdraw_fee_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  manual_platform_fee numeric(12,0) NOT NULL DEFAULT 5000 CHECK (manual_platform_fee BETWEEN 0 AND 10000000),
  instant_platform_fee numeric(12,0) NOT NULL DEFAULT 5000 CHECK (instant_platform_fee BETWEEN 0 AND 10000000),
  free_plan_fee numeric(12,0) NOT NULL DEFAULT 5000 CHECK (free_plan_fee BETWEEN 0 AND 10000000),
  vip_plan_fee numeric(12,0) NOT NULL DEFAULT 0 CHECK (vip_plan_fee BETWEEN 0 AND 10000000),
  premium_plan_fee numeric(12,0) NOT NULL DEFAULT 0 CHECK (premium_plan_fee BETWEEN 0 AND 10000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.showlink_withdraw_fee_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.showlink_withdraw_fee_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage component withdrawal fees" ON public.showlink_withdraw_fee_settings;
CREATE POLICY "Admins manage component withdrawal fees" ON public.showlink_withdraw_fee_settings FOR ALL TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.admin_get_withdraw_fee_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r public.showlink_withdraw_fee_settings%ROWTYPE;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT * INTO r FROM public.showlink_withdraw_fee_settings WHERE id=true;
 RETURN jsonb_build_object('manual_platform_fee',r.manual_platform_fee,'instant_platform_fee',r.instant_platform_fee,'free_plan_fee',r.free_plan_fee,'vip_plan_fee',r.vip_plan_fee,'premium_plan_fee',r.premium_plan_fee,'updated_at',r.updated_at);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_save_withdraw_fee_settings(
 p_manual_platform_fee numeric,p_instant_platform_fee numeric,p_free_plan_fee numeric,p_vip_plan_fee numeric,p_premium_plan_fee numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_manual_platform_fee IS NULL OR p_instant_platform_fee IS NULL OR p_free_plan_fee IS NULL OR p_vip_plan_fee IS NULL OR p_premium_plan_fee IS NULL
    OR least(p_manual_platform_fee,p_instant_platform_fee,p_free_plan_fee,p_vip_plan_fee,p_premium_plan_fee)<0
    OR greatest(p_manual_platform_fee,p_instant_platform_fee,p_free_plan_fee,p_vip_plan_fee,p_premium_plan_fee)>10000000
    OR trunc(p_manual_platform_fee)<>p_manual_platform_fee OR trunc(p_instant_platform_fee)<>p_instant_platform_fee OR trunc(p_free_plan_fee)<>p_free_plan_fee OR trunc(p_vip_plan_fee)<>p_vip_plan_fee OR trunc(p_premium_plan_fee)<>p_premium_plan_fee
 THEN RAISE EXCEPTION 'INVALID_WITHDRAW_FEE_AMOUNT'; END IF;
 UPDATE public.showlink_withdraw_fee_settings SET manual_platform_fee=p_manual_platform_fee,instant_platform_fee=p_instant_platform_fee,free_plan_fee=p_free_plan_fee,vip_plan_fee=p_vip_plan_fee,premium_plan_fee=p_premium_plan_fee,updated_at=now() WHERE id=true;
 RETURN public.admin_get_withdraw_fee_settings();
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_withdraw_fee_settings() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_save_withdraw_fee_settings(numeric,numeric,numeric,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_get_withdraw_fee_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_withdraw_fee_settings(numeric,numeric,numeric,numeric,numeric) TO authenticated;

-- Public authenticated rules RPC: UI fee preview matches the actual server-side combined fee.
CREATE OR REPLACE FUNCTION public.showlink_get_withdrawal_rules()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE result jsonb; member_plan text; settings public.showlink_withdraw_fee_settings%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
 member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
 SELECT * INTO settings FROM public.showlink_withdraw_fee_settings WHERE id=true;
 SELECT jsonb_build_object(
  'plan',member_plan,
  'fees',jsonb_build_object(
   'manual',jsonb_build_object('free',settings.manual_platform_fee+settings.free_plan_fee,'vip',settings.manual_platform_fee+settings.vip_plan_fee,'premium',settings.manual_platform_fee+settings.premium_plan_fee),
   'instant',jsonb_build_object('free',settings.instant_platform_fee+settings.free_plan_fee,'vip',settings.instant_platform_fee+settings.vip_plan_fee,'premium',settings.instant_platform_fee+settings.premium_plan_fee)),
  'holidays',coalesce((SELECT jsonb_agg(jsonb_build_object('date',holiday_date::text,'label',label) ORDER BY holiday_date) FROM public.showlink_withdrawal_holidays),'[]'::jsonb),
  'timezone','Asia/Jakarta') INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.showlink_get_withdrawal_rules() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.showlink_get_withdrawal_rules() TO authenticated;

-- Fee functions return combined fee so withdrawal UI preview and RPC calculation use same total.
CREATE OR REPLACE FUNCTION public.showlink_manual_withdraw_fee(p_amount numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE member_plan text; platform_fee numeric; plan_fee numeric;
BEGIN
 SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
 member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
 SELECT manual_platform_fee, CASE member_plan WHEN 'free' THEN free_plan_fee WHEN 'vip' THEN vip_plan_fee ELSE premium_plan_fee END INTO platform_fee,plan_fee FROM public.showlink_withdraw_fee_settings WHERE id=true;
 RETURN coalesce(platform_fee,5000)+coalesce(plan_fee,5000);
END; $$;
CREATE OR REPLACE FUNCTION public.showlink_instant_withdraw_fee(p_amount numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE member_plan text; platform_fee numeric; plan_fee numeric;
BEGIN
 SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
 member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
 SELECT instant_platform_fee, CASE member_plan WHEN 'free' THEN free_plan_fee WHEN 'vip' THEN vip_plan_fee ELSE premium_plan_fee END INTO platform_fee,plan_fee FROM public.showlink_withdraw_fee_settings WHERE id=true;
 RETURN coalesce(platform_fee,5000)+coalesce(plan_fee,5000);
END; $$;

CREATE OR REPLACE FUNCTION public.showlink_guard_withdrawal_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  mode_text text := lower(coalesce(NEW.metadata->>'mode','manual'));
  member_plan text := 'free';
  jakarta_now timestamp := now() AT TIME ZONE 'Asia/Jakarta';
  minute_of_day integer;
  dow integer;
  fee numeric;
BEGIN
  IF mode_text NOT IN ('manual','instant') THEN RAISE EXCEPTION 'INVALID_WITHDRAW_MODE'; END IF;
  IF NEW.amount < (CASE WHEN mode_text='manual' THEN 100000 ELSE 50000 END) THEN
    IF mode_text='manual' THEN RAISE EXCEPTION 'MIN_MANUAL_WITHDRAWAL_100000';
    ELSE RAISE EXCEPTION 'MIN_INSTANT_WITHDRAWAL_50000'; END IF;
  END IF;
  SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=NEW.user_id;
  member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
  IF mode_text='instant' AND member_plan='free' THEN RAISE EXCEPTION 'INSTANT_WITHDRAWAL_PLAN_REQUIRED'; END IF;
  dow := extract(dow FROM jakarta_now)::integer;
  IF dow IN (0,5,6) THEN RAISE EXCEPTION 'WITHDRAWAL_CLOSED_DAY'; END IF;
  IF EXISTS(SELECT 1 FROM public.showlink_withdrawal_holidays WHERE holiday_date=jakarta_now::date) THEN RAISE EXCEPTION 'WITHDRAWAL_PUBLIC_HOLIDAY'; END IF;
  minute_of_day := extract(hour FROM jakarta_now)::integer*60 + extract(minute FROM jakarta_now)::integer;
  IF minute_of_day < 540 OR minute_of_day >= 1140 THEN RAISE EXCEPTION 'WITHDRAWAL_OUTSIDE_BUSINESS_HOURS'; END IF;
  IF NOT coalesce((SELECT withdrawals_open FROM public.platform_controls WHERE id=true),true) THEN RAISE EXCEPTION 'WITHDRAWALS_CLOSED'; END IF;
  IF mode_text='manual' AND NOT coalesce((SELECT manual_withdrawals_open FROM public.platform_controls WHERE id=true),true) THEN RAISE EXCEPTION 'MANUAL_WITHDRAWAL_DISABLED'; END IF;
  IF mode_text='instant' AND NOT coalesce((SELECT instant_withdrawals_open FROM public.platform_controls WHERE id=true),true) THEN RAISE EXCEPTION 'INSTANT_WITHDRAWAL_DISABLED'; END IF;
  IF mode_text='manual' THEN
    SELECT manual_platform_fee + CASE member_plan WHEN 'free' THEN free_plan_fee WHEN 'vip' THEN vip_plan_fee ELSE premium_plan_fee END
      INTO fee FROM public.showlink_withdraw_fee_settings WHERE id=true;
  ELSE
    SELECT instant_platform_fee + CASE member_plan WHEN 'free' THEN free_plan_fee WHEN 'vip' THEN vip_plan_fee ELSE premium_plan_fee END
      INTO fee FROM public.showlink_withdraw_fee_settings WHERE id=true;
  END IF;
  fee := coalesce(fee,CASE WHEN mode_text='manual' THEN 10000 ELSE 10000 END);
  NEW.fee := fee;
  NEW.net_amount := greatest(0,coalesce(NEW.amount,0)-fee);
  NEW.metadata := coalesce(NEW.metadata,'{}'::jsonb) || jsonb_build_object('mode',mode_text,'plan_at_request',member_plan,'fee',fee,'net_amount',NEW.net_amount,'withdrawal_timezone','Asia/Jakarta');
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.showlink_guard_withdrawal_insert() FROM PUBLIC,anon,authenticated;
