-- ShowLink Withdrawal V20 — unified admin switch + WIB schedule
-- Manual + Instant withdrawal, fee rules, daily limit, admin approval/rejection,
-- user/admin notifications and safe balance reservation.

CREATE TABLE IF NOT EXISTS public.platform_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  withdrawals_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.platform_controls(id) VALUES(true) ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS withdrawals_created_user_idx
  ON public.withdrawals(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.showlink_manual_withdraw_fee(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Manual fee schedule requested by product: 50k=4k, 100k=8k, 150k=16k,
  -- then +8k for each additional 50k tier.
  IF p_amount <= 50000 THEN RETURN 4000;
  ELSIF p_amount <= 100000 THEN RETURN 8000;
  ELSE RETURN 8000 + (ceil((p_amount - 100000) / 50000.0) * 8000); END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.showlink_instant_withdraw_fee(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Instant: Rp12.000 fee for every Rp50.000 requested.
  RETURN ceil(greatest(p_amount,50000) / 50000.0) * 12000;
END; $$;

DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,uuid,text);
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,uuid);

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
  IF p_mode NOT IN ('manual','instant') THEN RAISE EXCEPTION 'INVALID_WITHDRAW_MODE'; END IF;
  -- The admin master switch blocks every withdrawal mode.
  IF NOT COALESCE((SELECT withdrawals_open FROM public.platform_controls WHERE id=true), true) THEN
    RAISE EXCEPTION 'WITHDRAWALS_CLOSED';
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

  SELECT coalesce(sum(amount),0) INTO used_today
  FROM public.withdrawals
  WHERE user_id=uid
    AND status IN ('pending','processing','paid')
    AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = now_jakarta::date;

  IF used_today + p_amount > daily_limit THEN
    RAISE EXCEPTION 'DAILY_WITHDRAW_LIMIT';
  END IF;

  SELECT * INTO m
  FROM public.withdrawal_methods
  WHERE id=p_method_id AND user_id=uid AND is_active=true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_METHOD_NOT_FOUND'; END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id=uid FOR UPDATE;
  total_debit := p_amount;
  IF NOT FOUND OR w.available_balance < total_debit THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE';
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
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,uuid,text) TO authenticated;
-- Remove the obsolete two-argument overload so PostgREST cannot call the wrong logic.
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,uuid);

CREATE OR REPLACE FUNCTION public.showlink_withdrawal_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
  SELECT jsonb_build_object(
    'withdrawals_open', COALESCE((SELECT withdrawals_open FROM public.platform_controls WHERE id=true), true),
    'manual_open_by_schedule', ((extract(hour from (now() AT TIME ZONE 'Asia/Jakarta'))::int * 60 + extract(minute from (now() AT TIME ZONE 'Asia/Jakarta'))::int) >= 480
      AND (extract(hour from (now() AT TIME ZONE 'Asia/Jakarta'))::int * 60 + extract(minute from (now() AT TIME ZONE 'Asia/Jakarta'))::int) < 1260),
    'timezone', 'Asia/Jakarta',
    'server_time', now() AT TIME ZONE 'Asia/Jakarta'
  );
$$;
REVOKE ALL ON FUNCTION public.showlink_withdrawal_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.showlink_withdrawal_availability() TO authenticated;

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
  IF p_status NOT IN ('processing','paid','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
  before_status := w.status;
  total_debit := coalesce((w.metadata->>'total_debit')::numeric, w.amount);

  IF before_status IN ('paid','rejected','cancelled') THEN
    RAISE EXCEPTION 'WITHDRAWAL_ALREADY_FINAL';
  END IF;

  IF p_status='rejected' AND note_text IS NULL THEN
    RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
  END IF;

  UPDATE public.withdrawals
  SET status=p_status,
      admin_note=note_text,
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
REVOKE ALL ON FUNCTION public.admin_update_withdrawal(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_withdrawal_notifications(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
    FROM (
      SELECT n.id,n.title,n.message,n.is_read,n.created_at,n.metadata
      FROM public.notifications n
      WHERE n.user_id=auth.uid() AND n.type='admin_withdrawal'
      ORDER BY n.created_at DESC
      LIMIT greatest(1,least(p_limit,100))
    ) x
  ),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_withdrawal_notifications(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_withdrawal_notifications(integer) TO authenticated;
