-- ShowLink withdrawal eligibility and minimums (reviewed version)
-- Instant: VIP/Premium only, minimum Rp50.000.
-- Manual: all plans, minimum Rp100.000.
-- Preserves existing platform fee functions, controls, and daily limit.
-- Apply in Supabase SQL Editor after confirming the referenced tables/columns exist.

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_method_id uuid,
  p_mode text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  w public.wallets%ROWTYPE;
  m public.withdrawal_methods%ROWTYPE;
  wid uuid;
  fee numeric := 0;
  total_debit numeric;
  net_amount numeric;
  used_today numeric := 0;
  daily_limit numeric := 500000;
  now_jakarta timestamp;
  minute_of_day integer;
  admin_id uuid;
  account_label text;
  member_plan text := 'free';
  min_amount numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_mode IS NULL OR p_mode NOT IN ('manual', 'instant') THEN
    RAISE EXCEPTION 'INVALID_WITHDRAW_MODE';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_WITHDRAW_AMOUNT';
  END IF;

  SELECT lower(coalesce(plan, 'free'))
    INTO member_plan
  FROM public.profiles
  WHERE id = uid;
  member_plan := coalesce(member_plan, 'free');

  IF p_mode = 'instant' AND member_plan NOT IN ('vip', 'premium') THEN
    RAISE EXCEPTION 'INSTANT_WITHDRAWAL_PLAN_REQUIRED';
  END IF;

  min_amount := CASE WHEN p_mode = 'manual' THEN 100000 ELSE 50000 END;
  IF p_amount < min_amount THEN
    IF p_mode = 'manual' THEN
      RAISE EXCEPTION 'MIN_MANUAL_WITHDRAWAL_100000';
    ELSE
      RAISE EXCEPTION 'MIN_INSTANT_WITHDRAWAL_50000';
    END IF;
  END IF;

  IF NOT coalesce((SELECT withdrawals_open FROM public.platform_controls WHERE id = true), true) THEN
    RAISE EXCEPTION 'WITHDRAWALS_CLOSED';
  END IF;
  IF p_mode = 'manual'
     AND NOT coalesce((SELECT manual_withdrawals_open FROM public.platform_controls WHERE id = true), true) THEN
    RAISE EXCEPTION 'MANUAL_WITHDRAWAL_DISABLED';
  END IF;
  IF p_mode = 'instant'
     AND NOT coalesce((SELECT instant_withdrawals_open FROM public.platform_controls WHERE id = true), true) THEN
    RAISE EXCEPTION 'INSTANT_WITHDRAWAL_DISABLED';
  END IF;

  PERFORM public.release_due_settlements();

  now_jakarta := now() AT TIME ZONE 'Asia/Jakarta';
  minute_of_day := extract(hour FROM now_jakarta)::integer * 60
                  + extract(minute FROM now_jakarta)::integer;

  IF p_mode = 'manual' THEN
    IF minute_of_day < 480 OR minute_of_day >= 1260 THEN
      RAISE EXCEPTION 'MANUAL_WITHDRAWAL_CLOSED';
    END IF;
    fee := public.showlink_manual_withdraw_fee(p_amount);
  ELSE
    IF p_amount NOT IN (50000, 100000, 150000, 200000) THEN
      RAISE EXCEPTION 'INVALID_INSTANT_AMOUNT';
    END IF;
    fee := public.showlink_instant_withdraw_fee(p_amount);
  END IF;

  IF fee IS NULL OR fee < 0 THEN
    RAISE EXCEPTION 'INVALID_WITHDRAWAL_FEE';
  END IF;

  SELECT coalesce(sum(amount), 0)
    INTO used_today
  FROM public.withdrawals
  WHERE user_id = uid
    AND status IN ('pending', 'processing', 'paid')
    AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = now_jakarta::date;

  IF used_today + p_amount > daily_limit THEN
    RAISE EXCEPTION 'DAILY_WITHDRAW_LIMIT';
  END IF;

  SELECT *
    INTO m
  FROM public.withdrawal_methods
  WHERE id = p_method_id
    AND user_id = uid
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_METHOD_NOT_FOUND';
  END IF;

  SELECT *
    INTO w
  FROM public.wallets
  WHERE user_id = uid
  FOR UPDATE;

  IF NOT FOUND OR coalesce(w.available_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE';
  END IF;

  total_debit := p_amount;
  net_amount := greatest(0, p_amount - fee);
  account_label := coalesce(m.method_type, '-') || ' • ' || coalesce(m.account_number, '-');

  INSERT INTO public.withdrawals (
    user_id, method_id, amount, fee, net_amount, status, metadata
  ) VALUES (
    uid, m.id, p_amount, fee, net_amount, 'pending',
    jsonb_build_object(
      'mode', p_mode,
      'total_debit', total_debit,
      'account_name', m.account_name,
      'method_type', m.method_type,
      'account_number', m.account_number,
      'plan_at_request', member_plan,
      'requested_at_jakarta', now_jakarta
    )
  )
  RETURNING id INTO wid;

  -- Reserve the requested amount from the available wallet balance.
  -- Do not increment lifetime_withdrawn/total_withdrawn here: this request is still pending.
  UPDATE public.wallets
  SET available_balance = available_balance - total_debit,
      updated_at = now()
  WHERE user_id = uid;

  UPDATE public.profiles
  SET balance = greatest(0, coalesce(balance, 0) - total_debit),
      updated_at = now()
  WHERE id = uid;

  INSERT INTO public.wallet_transactions (
    user_id, type, direction, amount, balance_before, balance_after,
    withdrawal_id, description, metadata
  ) VALUES (
    uid, 'withdrawal', 'debit', total_debit,
    w.available_balance, w.available_balance - total_debit,
    wid, 'Withdrawal request (pending)',
    jsonb_build_object('requested_amount', p_amount, 'fee', fee, 'mode', p_mode)
  );

  INSERT INTO public.notifications (user_id, type, title, message, link_url, metadata)
  VALUES (
    uid, 'withdrawal', 'Withdrawal diajukan',
    format(
      'Nominal %s • Rekening %s • Fee %s • Bersih %s. Menunggu persetujuan admin.',
      to_char(p_amount, 'FM999G999G999G990D00'),
      account_label,
      to_char(fee, 'FM999G999G999G990D00'),
      to_char(net_amount, 'FM999G999G999G990D00')
    ),
    '/withdraw.html',
    jsonb_build_object(
      'withdrawal_id', wid, 'status', 'pending', 'mode', p_mode,
      'amount', p_amount, 'fee', fee, 'total_debit', total_debit
    )
  );

  FOR admin_id IN
    SELECT id FROM public.profiles WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_url, metadata)
    VALUES (
      admin_id, 'admin_withdrawal', 'Withdrawal baru',
      format(
        'Withdrawal %s: %s • Rekening %s • Fee %s • Bersih %s. Menunggu approval.',
        to_char(p_amount, 'FM999G999G999G990D00'), p_mode, account_label,
        to_char(fee, 'FM999G999G999G990D00'),
        to_char(net_amount, 'FM999G999G999G990D00')
      ),
      '/admin.html',
      jsonb_build_object('withdrawal_id', wid, 'user_id', uid, 'status', 'pending')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'withdrawal_id', wid,
    'amount', p_amount,
    'fee', fee,
    'net_amount', net_amount,
    'total_debit', total_debit,
    'status', 'pending',
    'mode', p_mode,
    'plan', member_plan,
    'daily_used', used_today + p_amount,
    'daily_limit', daily_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) TO authenticated;
