-- ShowLink: Adsterra 10-slot + 5 endorsement image/link settings
-- Run this migration once in Supabase SQL Editor before deploying the new frontend.
ALTER TABLE public.showlink_admin_settings
  ADD COLUMN IF NOT EXISTS endorsement_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Public bucket for endorsement images; writes remain restricted to administrators.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('showlink-endorsements','showlink-endorsements',true,5242880,ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/gif'];

DROP POLICY IF EXISTS "ShowLink endorsement images are public readable" ON storage.objects;
CREATE POLICY "ShowLink endorsement images are public readable" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id='showlink-endorsements');
DROP POLICY IF EXISTS "ShowLink admins upload endorsement images" ON storage.objects;
CREATE POLICY "ShowLink admins upload endorsement images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id='showlink-endorsements' AND public.is_current_user_admin());
DROP POLICY IF EXISTS "ShowLink admins update endorsement images" ON storage.objects;
CREATE POLICY "ShowLink admins update endorsement images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id='showlink-endorsements' AND public.is_current_user_admin()) WITH CHECK (bucket_id='showlink-endorsements' AND public.is_current_user_admin());
DROP POLICY IF EXISTS "ShowLink admins delete endorsement images" ON storage.objects;
CREATE POLICY "ShowLink admins delete endorsement images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id='showlink-endorsements' AND public.is_current_user_admin());

-- New overload preserves compatibility with older frontends using the previous 10-argument function.
CREATE OR REPLACE FUNCTION public.admin_save_control_center_settings(
 p_cpm numeric,
 p_navbar_visibility jsonb,
 p_adsterra_slots jsonb,
 p_image_ad_enabled boolean,
 p_image_ad_url text,
 p_image_ad_target_url text,
 p_shortlink_redirect_enabled boolean,
 p_shortlink_redirect_label text,
 p_shortlink_redirect_url text,
 p_shortlink_flow jsonb,
 p_endorsement_slots jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_slots jsonb; v_endorsements jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_cpm IS NULL OR p_cpm < 0 OR p_cpm > 1000000 THEN RAISE EXCEPTION 'CPM_INVALID'; END IF;
 IF jsonb_typeof(coalesce(p_adsterra_slots,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'ADSTERRA_SLOTS_MUST_BE_ARRAY'; END IF;
 IF jsonb_array_length(coalesce(p_adsterra_slots,'[]'::jsonb)) > 10 THEN RAISE EXCEPTION 'MAX_10_ADSTERRA_SLOTS'; END IF;
 IF jsonb_typeof(coalesce(p_endorsement_slots,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'ENDORSEMENT_SLOTS_MUST_BE_ARRAY'; END IF;
 IF jsonb_array_length(coalesce(p_endorsement_slots,'[]'::jsonb)) > 5 THEN RAISE EXCEPTION 'MAX_5_ENDORSEMENT_SLOTS'; END IF;
 v_slots := coalesce(p_adsterra_slots,'[]'::jsonb);
 v_endorsements := coalesce(p_endorsement_slots,'[]'::jsonb);
 UPDATE public.showlink_admin_settings SET
   cpm=p_cpm,
   navbar_visibility=coalesce(p_navbar_visibility,'{}'::jsonb),
   adsterra_slots=v_slots,
   image_ad_enabled=coalesce(p_image_ad_enabled,false),
   image_ad_url=left(coalesce(p_image_ad_url,''),2000),
   image_ad_target_url=left(coalesce(p_image_ad_target_url,''),2000),
   shortlink_redirect_enabled=coalesce(p_shortlink_redirect_enabled,true),
   shortlink_redirect_label=left(coalesce(nullif(trim(p_shortlink_redirect_label),''),'Lanjutkan'),80),
   shortlink_redirect_url=left(coalesce(p_shortlink_redirect_url,''),2000),
   shortlink_flow=coalesce(p_shortlink_flow,'{"task1":true,"task2":true,"task3":true}'::jsonb),
   endorsement_slots=v_endorsements,
   updated_at=now(),updated_by=auth.uid()
 WHERE id=true;
 RETURN jsonb_build_object('ok',true,'adsterra_slot_count',jsonb_array_length(v_slots),'endorsement_slot_count',jsonb_array_length(v_endorsements));
END; $$;
REVOKE ALL ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_shortlink_control_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
 SELECT jsonb_build_object(
  'cpm',s.cpm,
  'navbar_visibility',s.navbar_visibility,
  'image_ad_enabled',s.image_ad_enabled,
  'image_ad_url',s.image_ad_url,
  'image_ad_target_url',s.image_ad_target_url,
  'shortlink_redirect_enabled',s.shortlink_redirect_enabled,
  'shortlink_redirect_label',s.shortlink_redirect_label,
  'shortlink_redirect_url',s.shortlink_redirect_url,
  'shortlink_flow',s.shortlink_flow,
  'adsterra_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY (x.value->>'slot')::integer),'[]'::jsonb) FROM jsonb_array_elements(s.adsterra_slots) x(value) WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10),
  'endorsement_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY (x.value->>'slot')::integer),'[]'::jsonb) FROM jsonb_array_elements(s.endorsement_slots) x(value) WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 5)
 ) FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;
