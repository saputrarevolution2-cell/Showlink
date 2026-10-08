-- =========================================================
-- ShowLink — Payment Link access fix
-- All authenticated users can create Payment Links.
-- Cashi-compatible minimum price remains Rp2,000.
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_title text,
  p_description text,
  p_price numeric,
  p_content_html text DEFAULT '',
  p_content_text text DEFAULT '',
  p_thumbnail_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_slug text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;

  IF p_content_text IS NULL OR length(trim(p_content_text)) = 0 THEN
    RAISE EXCEPTION 'INVALID_CONTENT';
  END IF;

  -- Cashi minimum: Rp2,000. Maximum remains Rp100,000.
  IF p_price IS NULL OR p_price < 2000 OR p_price > 100000 THEN
    RAISE EXCEPTION 'INVALID_PRICE: Payment Link price must be between Rp2,000 and Rp100,000';
  END IF;

  v_slug := public.showlink_random_slug(6);

  INSERT INTO public.payment_links(
    owner_id,
    slug,
    title,
    description,
    price,
    content_html,
    content_text,
    thumbnail_url,
    status,
    published_at
  )
  VALUES(
    auth.uid(),
    v_slug,
    trim(p_title),
    coalesce(p_description, ''),
    p_price,
    coalesce(p_content_html, ''),
    p_content_text,
    p_thumbnail_url,
    'active',
    now()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'slug', v_slug,
    'url', 'https://showlink.my.id/p/' || v_slug,
    'checkout_url', 'https://showlink.my.id/p/' || v_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) TO authenticated;
