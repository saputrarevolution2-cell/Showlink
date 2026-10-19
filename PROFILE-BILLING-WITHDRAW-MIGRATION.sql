-- ShowLink Profile extended fields migration (run once in Supabase SQL Editor)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawal_method text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawal_account text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address1 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address2 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_zip text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_phone text;
COMMENT ON COLUMN public.profiles.bank_account_name IS 'Account holder name as shown on bank/e-wallet; sensitive personal data';
COMMENT ON COLUMN public.profiles.withdrawal_account IS 'Withdrawal account number; restrict admin access appropriately';
-- Existing profiles RLS must remain enabled. Admin visibility should be enforced by the site's existing admin policies/RPC, not by exposing this table publicly.
