-- ShowLink public Payment Link: expose only real successful sale count for one active link.
-- Run once in Supabase SQL Editor.
CREATE OR REPLACE FUNCTION public.get_payment_link_sales_count(p_payment_link_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(pl.sales_count, 0)::bigint
  FROM public.payment_links AS pl
  WHERE pl.id = p_payment_link_id
    AND pl.status = 'active'
    AND (pl.expires_at IS NULL OR pl.expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_link_sales_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_link_sales_count(uuid) TO anon, authenticated;
