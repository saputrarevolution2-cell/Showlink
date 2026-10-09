-- ShowLink Admin Control Panel migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.platform_controls (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  withdrawals_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.platform_controls(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.platform_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_controls FROM anon, authenticated;
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
REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_platform_controls()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN (SELECT to_jsonb(c) FROM public.platform_controls c WHERE id=true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_platform_controls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_controls() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_withdrawals_open(p_open boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  UPDATE public.platform_controls SET withdrawals_open=p_open,updated_at=now(),updated_by=auth.uid() WHERE id=true;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
  VALUES(auth.uid(),CASE WHEN p_open THEN 'open_withdrawals' ELSE 'close_withdrawals' END,'platform',jsonb_build_object('withdrawals_open',p_open));
  INSERT INTO public.notifications(user_id,type,title,message,link_url)
  SELECT p.id,'system',CASE WHEN p_open THEN 'Withdrawal dibuka kembali' ELSE 'Withdrawal ditutup sementara' END,
    CASE WHEN p_open THEN 'Permintaan withdrawal kini dapat diajukan kembali.' ELSE 'Permintaan withdrawal sedang ditutup sementara oleh admin.' END,'/withdraw.html'
  FROM public.profiles p;
  RETURN jsonb_build_object('ok',true,'withdrawals_open',p_open);
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_withdrawals_open(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_withdrawals_open(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_announce_all(p_title text,p_message text,p_link_url text DEFAULT '/dashboard.html')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF length(trim(coalesce(p_title,'')))<2 OR length(trim(coalesce(p_message,'')))<2 THEN RAISE EXCEPTION 'ANNOUNCEMENT_REQUIRED'; END IF;
  IF length(p_title)>140 OR length(p_message)>4000 THEN RAISE EXCEPTION 'ANNOUNCEMENT_TOO_LONG'; END IF;
  INSERT INTO public.notifications(user_id,type,title,message,link_url)
  SELECT p.id,'announcement',trim(p_title),trim(p_message),coalesce(nullif(trim(p_link_url),''),'/dashboard.html') FROM public.profiles p;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
  VALUES(auth.uid(),'announce_all','users',jsonb_build_object('recipients',n,'title',trim(p_title)));
  RETURN jsonb_build_object('ok',true,'recipients',n);
END; $$;
REVOKE ALL ON FUNCTION public.admin_announce_all(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_announce_all(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_payment_link(
  p_link_id uuid,p_title text,p_price numeric,p_status text,p_description text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r public.payment_links%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status NOT IN ('draft','active','paused','expired','deleted') THEN RAISE EXCEPTION 'INVALID_LINK_STATUS'; END IF;
  IF length(trim(coalesce(p_title,'')))<2 OR p_price IS NULL OR p_price<100 THEN RAISE EXCEPTION 'INVALID_LINK_FIELDS'; END IF;
  UPDATE public.payment_links SET title=trim(p_title),price=p_price,status=p_status,
    description=coalesce(p_description,description),updated_at=now()
  WHERE id=p_link_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'update_payment_link','payment_link',r.id::text,jsonb_build_object('title',r.title,'price',r.price,'status',r.status));
  RETURN jsonb_build_object('ok',true,'id',r.id,'title',r.title,'price',r.price,'status',r.status);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_payment_link(uuid,text,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_link(uuid,text,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_link(p_link_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  UPDATE public.payment_links SET status='deleted',updated_at=now() WHERE id=p_link_id AND status<>'deleted';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n=0 THEN RAISE EXCEPTION 'LINK_NOT_FOUND_OR_DELETED'; END IF;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,target_id)
  VALUES(auth.uid(),'delete_payment_link','payment_link',p_link_id::text);
  RETURN jsonb_build_object('ok',true,'id',p_link_id);
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_payment_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment_link(uuid) TO authenticated;

-- Do not redefine request_withdrawal here: the canonical 3-argument (p_mode)
-- implementation lives in withdraw-migration.sql and enforces both the admin switch
-- and the WIB schedule. Remove only the obsolete overload if it still exists.
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric,uuid);

CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT id,username,auth_email,display_name,plan,is_admin,is_banned,balance,pending_balance,total_earned,total_withdrawn,created_at
    FROM public.profiles ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_users(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_gateway_settings(
  p_cashi_enabled boolean,p_bayargg_enabled boolean,p_default_gateway text,
  p_platform_fee_percent numeric,p_settlement_days integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE g public.payment_gateway_settings%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF NOT (p_cashi_enabled OR p_bayargg_enabled) THEN RAISE EXCEPTION 'AT_LEAST_ONE_GATEWAY_REQUIRED'; END IF;
  IF p_default_gateway NOT IN ('cashi','bayargg') THEN RAISE EXCEPTION 'INVALID_GATEWAY'; END IF;
  IF (p_default_gateway='cashi' AND NOT p_cashi_enabled) OR (p_default_gateway='bayargg' AND NOT p_bayargg_enabled) THEN RAISE EXCEPTION 'DEFAULT_GATEWAY_DISABLED'; END IF;
  IF p_platform_fee_percent IS NULL OR p_platform_fee_percent<0 OR p_platform_fee_percent>100 THEN RAISE EXCEPTION 'INVALID_PLATFORM_FEE'; END IF;
  IF p_settlement_days IS NULL OR p_settlement_days<0 OR p_settlement_days>30 THEN RAISE EXCEPTION 'INVALID_SETTLEMENT_DAYS'; END IF;
  UPDATE public.payment_gateway_settings SET cashi_enabled=p_cashi_enabled,bayargg_enabled=p_bayargg_enabled,
    default_gateway=p_default_gateway,platform_fee_percent=p_platform_fee_percent,settlement_days=p_settlement_days,
    updated_at=now() WHERE id=true RETURNING * INTO g;
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details) VALUES(auth.uid(),'update_gateway_settings','platform',to_jsonb(g));
  RETURN to_jsonb(g);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(p_withdrawal_id uuid,p_status text,p_admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE w public.withdrawals%ROWTYPE; before_status text; wa public.wallets%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status NOT IN ('pending','processing','paid','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
  before_status:=w.status;
  IF before_status IN ('paid','rejected','cancelled') AND p_status<>before_status THEN RAISE EXCEPTION 'WITHDRAWAL_ALREADY_FINALIZED'; END IF;
  IF before_status=p_status THEN RETURN jsonb_build_object('ok',true,'withdrawal_id',w.id,'status',w.status,'unchanged',true); END IF;
  UPDATE public.withdrawals SET status=p_status,admin_note=coalesce(nullif(trim(p_admin_note),''),admin_note),
    processed_by=auth.uid(),processed_at=CASE WHEN p_status IN ('paid','rejected','cancelled') THEN now() ELSE processed_at END,updated_at=now()
    WHERE id=w.id;
  IF p_status IN ('rejected','cancelled') AND before_status IN ('pending','processing') THEN
    SELECT * INTO wa FROM public.wallets WHERE user_id=w.user_id FOR UPDATE;
    IF FOUND THEN
      UPDATE public.wallets SET available_balance=available_balance+w.amount,updated_at=now() WHERE user_id=w.user_id;
      INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description)
      VALUES(w.user_id,'reversal','credit',w.amount,wa.available_balance,wa.available_balance+w.amount,w.id,'Withdrawal dikembalikan oleh admin');
    END IF;
    UPDATE public.profiles SET balance=balance+w.amount,updated_at=now() WHERE id=w.user_id;
  END IF;
  INSERT INTO public.notifications(user_id,type,title,message,link_url,metadata)
  VALUES(w.user_id,'withdrawal',CASE WHEN p_status='paid' THEN 'Withdrawal disetujui' WHEN p_status='rejected' THEN 'Withdrawal ditolak' WHEN p_status='processing' THEN 'Withdrawal sedang diproses' ELSE 'Status withdrawal berubah' END,
    CASE WHEN p_status='paid' THEN format('Withdrawal Rp%s telah disetujui/dibayar.',to_char(w.net_amount,'FM999G999G999G990D00'))
         WHEN p_status='rejected' THEN format('Withdrawal ditolak. Saldo Rp%s dikembalikan.%s',to_char(w.amount,'FM999G999G999G990D00'),CASE WHEN nullif(trim(p_admin_note),'') IS NULL THEN '' ELSE ' Catatan: '||trim(p_admin_note) END)
         WHEN p_status='processing' THEN 'Permintaan withdrawal kamu sedang diproses admin.'
         ELSE format('Status withdrawal berubah menjadi %s.',p_status) END,
    '/withdraw.html',jsonb_build_object('withdrawal_id',w.id,'status',p_status));
  INSERT INTO public.admin_audit_logs(admin_id,action,target_type,target_id,details)
  VALUES(auth.uid(),'update_withdrawal','withdrawal',w.id::text,jsonb_build_object('from',before_status,'to',p_status,'note',p_admin_note));
  RETURN jsonb_build_object('ok',true,'withdrawal_id',w.id,'status',p_status);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_withdrawal(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,text,text) TO authenticated;


-- Canonical withdrawal request function, schedule, and status RPC
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
