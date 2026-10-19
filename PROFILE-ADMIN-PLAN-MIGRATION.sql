-- ShowLink: admin user profile details + membership plan expiry.
-- Run this migration in Supabase SQL Editor.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
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

DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, text, timestamptz);
CREATE FUNCTION public.admin_set_user_plan(p_user_id uuid, p_plan text, p_expires_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_plan text := lower(trim(coalesce(p_plan, '')));
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
  IF v_plan NOT IN ('free','vip','premium') THEN RAISE EXCEPTION 'INVALID_PLAN' USING ERRCODE='22023'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'USER_ID_REQUIRED' USING ERRCODE='22023'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN RAISE EXCEPTION 'EXPIRY_MUST_BE_FUTURE' USING ERRCODE='22023'; END IF;
  UPDATE public.profiles SET plan=v_plan, plan_expires_at=p_expires_at, updated_at=now()
   WHERE id=p_user_id AND coalesce(is_admin,false)=false;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND_OR_PROTECTED' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('success',true,'user_id',p_user_id,'plan',v_plan,'plan_expires_at',p_expires_at);
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_user_plan(uuid,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT id, username, auth_email, display_name, plan, plan_expires_at, is_admin, is_banned,
      balance, pending_balance, total_earned, total_withdrawn, created_at,
      withdraw_name, withdraw_method, withdraw_account,
      billing_first_name, billing_last_name, billing_address1, billing_address2,
      billing_city, billing_state, billing_zip, billing_country, billing_phone,
      billing_withdraw_method, billing_withdraw_account
    FROM public.profiles ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_users(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;
