-- ShowLink: per-shortlink ad intensity and admin-configurable estimate tiers.
-- Run once in Supabase SQL Editor after SHORTLINK-SUPABASE-MIGRATION.sql and SHORTLINK-PAGE-ADS-MIGRATION.sql.

ALTER TABLE public.shortlinks
  ADD COLUMN IF NOT EXISTS ad_intensity text NOT NULL DEFAULT 'medium'
  CHECK (ad_intensity IN ('low','medium','high'));

-- Return the selected intensity in the existing public Shortlink payload.
CREATE OR REPLACE FUNCTION public.get_shortlink_public(p_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.shortlinks%rowtype;
BEGIN
  SELECT * INTO v FROM public.shortlinks WHERE slug=p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.shortlinks SET views=views+1 WHERE id=v.id;
  RETURN jsonb_build_object(
    'slug',v.slug,
    'title',v.title,
    'content_url',coalesce(v.content_url,v.destination_url),
    'access_price',v.access_price,
    'free_enabled',v.free_enabled,
    'ad_intensity',coalesce(v.ad_intensity,'medium')
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_shortlink_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shortlink_public(text) TO anon,authenticated;

-- Expose only the intensity string to the ad renderer; this function does not increment views.
CREATE OR REPLACE FUNCTION public.get_shortlink_ad_intensity(p_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(ad_intensity,'medium') FROM public.shortlinks WHERE slug=p_slug LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_shortlink_ad_intensity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shortlink_ad_intensity(text) TO anon,authenticated;

COMMENT ON COLUMN public.shortlinks.ad_intensity IS 'Member-selected ad slot intensity: low=50%, medium=75%, high=100%. This controls slot count only, never required clicks or task completion.';
