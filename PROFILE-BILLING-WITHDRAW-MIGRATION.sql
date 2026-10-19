-- ShowLink Profile: bank/e-wallet, billing address and withdrawal information.
-- Run this migration in Supabase SQL Editor before deploying the updated profile page.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdraw_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdraw_method text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdraw_account text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address1 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address2 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_zip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_withdraw_method text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_withdraw_account text;

-- Admin-only RPC: keep existing member fields and include all profile/billing details.
CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT id,username,auth_email,display_name,plan,is_admin,is_banned,balance,pending_balance,total_earned,total_withdrawn,created_at,
      withdraw_name,withdraw_method,withdraw_account,billing_first_name,billing_last_name,billing_address1,billing_address2,
      billing_city,billing_state,billing_zip,billing_country,billing_phone,billing_withdraw_method,billing_withdraw_account
    FROM public.profiles ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_users(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;
