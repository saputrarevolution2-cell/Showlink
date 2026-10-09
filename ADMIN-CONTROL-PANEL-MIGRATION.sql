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

-- Enforce the withdrawal switch in the actual request path, not only the UI.
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric,p_method_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE uid uuid:=auth.uid(); w public.wallets%ROWTYPE; m public.withdrawal_methods%ROWTYPE; wid uuid; fee numeric:=0; net numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT COALESCE((SELECT withdrawals_open FROM public.platform_controls WHERE id=true),true) THEN RAISE EXCEPTION 'WITHDRAWALS_CLOSED'; END IF;
  PERFORM public.release_due_settlements();
  IF p_amount IS NULL OR p_amount < 10000 THEN RAISE EXCEPTION 'MIN_WITHDRAWAL_10000'; END IF;
  SELECT * INTO m FROM public.withdrawal_methods WHERE id=p_method_id AND user_id=uid AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_METHOD_NOT_FOUND'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id=uid FOR UPDATE;
  IF NOT FOUND OR w.available_balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE'; END IF;
  net:=greatest(0,p_amount-fee);
  INSERT INTO public.withdrawals(user_id,method_id,amount,fee,net_amount,status) VALUES(uid,m.id,p_amount,fee,net,'pending') RETURNING id INTO wid;
  UPDATE public.wallets SET available_balance=available_balance-p_amount,lifetime_withdrawn=lifetime_withdrawn+p_amount,updated_at=now() WHERE user_id=uid;
  UPDATE public.profiles SET balance=greatest(0,balance-p_amount),total_withdrawn=total_withdrawn+p_amount,updated_at=now() WHERE id=uid;
  INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description) VALUES(uid,'withdrawal','debit',p_amount,w.available_balance,w.available_balance-p_amount,wid,'Withdrawal request');
  INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(uid,'withdrawal','Withdrawal diajukan',format('Permintaan withdrawal Rp%s berhasil dibuat.',to_char(p_amount,'FM999G999G999G990D00')),'/withdraw.html');
  RETURN jsonb_build_object('ok',true,'withdrawal_id',wid,'amount',p_amount,'net_amount',net,'status','pending');
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,uuid) TO authenticated;

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
