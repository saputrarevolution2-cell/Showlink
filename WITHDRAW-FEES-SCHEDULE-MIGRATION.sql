-- ShowLink Withdrawal: configurable fees by method + membership, public-holiday calendar,
-- and server-side enforcement. Run once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.showlink_withdrawal_fee_rules (
  mode text NOT NULL CHECK (mode IN ('manual','instant')),
  membership text NOT NULL CHECK (membership IN ('free','vip','premium')),
  fee_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0 AND fee_amount <= 10000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mode, membership)
);

INSERT INTO public.showlink_withdrawal_fee_rules(mode,membership,fee_amount) VALUES
 ('manual','free',5000),('manual','vip',5000),('manual','premium',5000),
 ('instant','free',10000),('instant','vip',5000),('instant','premium',5000)
ON CONFLICT (mode,membership) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.showlink_withdrawal_holidays (
  holiday_date date PRIMARY KEY,
  label text NOT NULL DEFAULT 'Tanggal merah',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Known upcoming national holiday; admins can maintain additional holidays/cuti bersama in Admin Panel.
INSERT INTO public.showlink_withdrawal_holidays(holiday_date,label) VALUES ('2026-12-25','Hari Natal')
ON CONFLICT (holiday_date) DO NOTHING;

ALTER TABLE public.showlink_withdrawal_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showlink_withdrawal_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage withdrawal fee rules" ON public.showlink_withdrawal_fee_rules;
CREATE POLICY "Admins manage withdrawal fee rules" ON public.showlink_withdrawal_fee_rules
  FOR ALL TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());
DROP POLICY IF EXISTS "Admins manage withdrawal holidays" ON public.showlink_withdrawal_holidays;
CREATE POLICY "Admins manage withdrawal holidays" ON public.showlink_withdrawal_holidays
  FOR ALL TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.showlink_get_withdrawal_rules()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE result jsonb; member_plan text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
  member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
  SELECT jsonb_build_object(
    'plan',member_plan,
    'fees',jsonb_build_object(
      'manual',jsonb_build_object(
        'free',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='manual' AND membership='free'),5000),
        'vip',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='manual' AND membership='vip'),5000),
        'premium',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='manual' AND membership='premium'),5000)),
      'instant',jsonb_build_object(
        'free',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='instant' AND membership='free'),10000),
        'vip',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='instant' AND membership='vip'),5000),
        'premium',coalesce((SELECT fee_amount FROM public.showlink_withdrawal_fee_rules WHERE mode='instant' AND membership='premium'),5000))),
    'holidays',coalesce((SELECT jsonb_agg(jsonb_build_object('date',holiday_date::text,'label',label) ORDER BY holiday_date) FROM public.showlink_withdrawal_holidays), '[]'::jsonb),
    'timezone','Asia/Jakarta'
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.showlink_get_withdrawal_rules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.showlink_get_withdrawal_rules() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_withdrawal_rules()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN jsonb_build_object(
    'fees',coalesce((SELECT jsonb_agg(jsonb_build_object('mode',mode,'membership',membership,'fee_amount',fee_amount) ORDER BY mode,membership) FROM public.showlink_withdrawal_fee_rules),'[]'::jsonb),
    'holidays',coalesce((SELECT jsonb_agg(jsonb_build_object('date',holiday_date::text,'label',label) ORDER BY holiday_date) FROM public.showlink_withdrawal_holidays),'[]'::jsonb)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.admin_save_withdrawal_rules(p_fees jsonb, p_holidays jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE item jsonb; holiday_item jsonb; d date; label_text text; n numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF coalesce(jsonb_typeof(p_fees),'') <> 'array' OR jsonb_array_length(p_fees) <> 6 THEN RAISE EXCEPTION 'INVALID_FEE_RULES'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_fees) LOOP
    IF item->>'mode' NOT IN ('manual','instant') OR item->>'membership' NOT IN ('free','vip','premium') THEN RAISE EXCEPTION 'INVALID_FEE_RULE'; END IF;
    n := (item->>'fee_amount')::numeric;
    IF n < 0 OR n > 10000000 THEN RAISE EXCEPTION 'INVALID_FEE_AMOUNT'; END IF;
    INSERT INTO public.showlink_withdrawal_fee_rules(mode,membership,fee_amount,updated_at)
    VALUES(item->>'mode',item->>'membership',n,now())
    ON CONFLICT(mode,membership) DO UPDATE SET fee_amount=EXCLUDED.fee_amount,updated_at=now();
  END LOOP;
  IF p_holidays IS NULL OR coalesce(jsonb_typeof(p_holidays),'') <> 'array' THEN RAISE EXCEPTION 'INVALID_HOLIDAYS'; END IF;
  DELETE FROM public.showlink_withdrawal_holidays;
  FOR holiday_item IN SELECT value FROM jsonb_array_elements(p_holidays) LOOP
    d := (holiday_item->>'date')::date;
    label_text := left(coalesce(nullif(trim(holiday_item->>'label'),''),'Tanggal merah'),120);
    INSERT INTO public.showlink_withdrawal_holidays(holiday_date,label,updated_at) VALUES(d,label_text,now())
    ON CONFLICT(holiday_date) DO UPDATE SET label=EXCLUDED.label,updated_at=now();
  END LOOP;
  RETURN public.admin_get_withdrawal_rules();
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_withdrawal_rules() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_save_withdrawal_rules(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_withdrawal_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_withdrawal_rules(jsonb,jsonb) TO authenticated;

-- Existing fee function names are kept so the current request_withdrawal RPC stays compatible.
CREATE OR REPLACE FUNCTION public.showlink_manual_withdraw_fee(p_amount numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE member_plan text; result numeric;
BEGIN
  SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
  member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
  SELECT fee_amount INTO result FROM public.showlink_withdrawal_fee_rules WHERE mode='manual' AND membership=member_plan;
  RETURN coalesce(result,5000);
END; $$;
CREATE OR REPLACE FUNCTION public.showlink_instant_withdraw_fee(p_amount numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE member_plan text; result numeric;
BEGIN
  SELECT lower(coalesce(plan,'free')) INTO member_plan FROM public.profiles WHERE id=auth.uid();
  member_plan := CASE WHEN member_plan IN ('vip','premium') THEN member_plan ELSE 'free' END;
  SELECT fee_amount INTO result FROM public.showlink_withdrawal_fee_rules WHERE mode='instant' AND membership=member_plan;
  RETURN coalesce(result,10000);
END; $$;

-- Enforce schedule, minimums, and the current plan-based fee at database level too.
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
  IF NEW.amount < CASE WHEN mode_text='manual' THEN 100000 ELSE 50000 END THEN
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
  SELECT fee_amount INTO fee FROM public.showlink_withdrawal_fee_rules WHERE mode=mode_text AND membership=member_plan;
  fee := coalesce(fee,CASE WHEN mode_text='manual' THEN 5000 ELSE 10000 END);
  NEW.fee := fee;
  NEW.net_amount := greatest(0,coalesce(NEW.amount,0)-fee);
  NEW.metadata := coalesce(NEW.metadata,'{}'::jsonb) || jsonb_build_object('mode',mode_text,'plan_at_request',member_plan,'fee',fee,'net_amount',NEW.net_amount,'withdrawal_timezone','Asia/Jakarta');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS showlink_guard_withdrawal_insert ON public.withdrawals;
CREATE TRIGGER showlink_guard_withdrawal_insert BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.showlink_guard_withdrawal_insert();
REVOKE ALL ON FUNCTION public.showlink_guard_withdrawal_insert() FROM PUBLIC, anon, authenticated;

-- Availability RPC now reflects weekday, business hours and admin-entered public holidays.
CREATE OR REPLACE FUNCTION public.showlink_withdrawal_availability()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE j timestamp := now() AT TIME ZONE 'Asia/Jakarta'; dow integer; mins integer; holiday boolean; open_by_schedule boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  dow := extract(dow FROM j)::integer; mins := extract(hour FROM j)::integer*60+extract(minute FROM j)::integer;
  SELECT EXISTS(SELECT 1 FROM public.showlink_withdrawal_holidays WHERE holiday_date=j::date) INTO holiday;
  open_by_schedule := dow NOT IN (0,5,6) AND NOT holiday AND mins>=540 AND mins<1140;
  RETURN jsonb_build_object(
    'withdrawals_open',coalesce((SELECT withdrawals_open FROM public.platform_controls WHERE id=true),true),
    'manual_withdrawals_open',coalesce((SELECT manual_withdrawals_open FROM public.platform_controls WHERE id=true),true),
    'instant_withdrawals_open',coalesce((SELECT instant_withdrawals_open FROM public.platform_controls WHERE id=true),true),
    'manual_open_by_schedule',open_by_schedule,'instant_open_by_schedule',open_by_schedule,
    'is_public_holiday',holiday,'weekday',dow,'timezone','Asia/Jakarta','server_time',j
  );
END; $$;
REVOKE ALL ON FUNCTION public.showlink_withdrawal_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.showlink_withdrawal_availability() TO authenticated;
