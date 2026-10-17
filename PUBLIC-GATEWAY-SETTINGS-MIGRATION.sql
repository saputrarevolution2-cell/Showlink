-- Run this migration in Supabase SQL Editor for an existing deployment.
-- Exposes only gateway enabled flags to the public checkout; no admin settings/secrets.
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  cashi_enabled boolean NOT NULL DEFAULT true,
  bayargg_enabled boolean NOT NULL DEFAULT true,
  default_gateway text NOT NULL DEFAULT 'cashi' CHECK (default_gateway IN ('cashi','bayargg')),
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00 CHECK (platform_fee_percent BETWEEN 0 AND 100),
  settlement_days integer NOT NULL DEFAULT 2 CHECK (settlement_days BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_gateway_settings(id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_public_gateway_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT jsonb_build_object(
    'cashi_enabled', COALESCE((SELECT cashi_enabled FROM public.payment_gateway_settings WHERE id = true), false),
    'bayargg_enabled', COALESCE((SELECT bayargg_enabled FROM public.payment_gateway_settings WHERE id = true), false)
  );
$$;
REVOKE ALL ON FUNCTION public.get_public_gateway_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_gateway_settings() TO anon, authenticated;
