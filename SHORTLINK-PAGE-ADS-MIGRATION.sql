-- ShowLink: page-specific Adsterra and endorsement slots (7 + 2 per page).
-- Run after SHORTLINK-ADS-ENDORSEMENTS-MIGRATION.sql in Supabase SQL Editor.
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
 IF jsonb_array_length(coalesce(p_adsterra_slots,'[]'::jsonb)) > 28 THEN RAISE EXCEPTION 'MAX_28_PAGE_ADSTERRA_SLOTS'; END IF;
 IF EXISTS (
   SELECT 1 FROM jsonb_array_elements(coalesce(p_adsterra_slots,'[]'::jsonb)) x(value)
   WHERE coalesce(x.value->>'page','') NOT IN ('task1','task2','task3','final')
      OR coalesce(x.value->>'slot','') !~ '^[1-7]$'
      OR coalesce(x.value->>'enabled','true') NOT IN ('true','false')
 ) THEN RAISE EXCEPTION 'INVALID_PAGE_ADSTERRA_SLOT'; END IF;
 IF jsonb_typeof(coalesce(p_endorsement_slots,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'ENDORSEMENT_SLOTS_MUST_BE_ARRAY'; END IF;
 IF jsonb_array_length(coalesce(p_endorsement_slots,'[]'::jsonb)) > 8 THEN RAISE EXCEPTION 'MAX_8_PAGE_ENDORSEMENT_SLOTS'; END IF;
 IF EXISTS (
   SELECT 1 FROM jsonb_array_elements(coalesce(p_endorsement_slots,'[]'::jsonb)) x(value)
   WHERE coalesce(x.value->>'page','') NOT IN ('task1','task2','task3','final')
      OR coalesce(x.value->>'slot','') !~ '^[1-2]$'
      OR coalesce(x.value->>'enabled','false') NOT IN ('true','false')
 ) THEN RAISE EXCEPTION 'INVALID_PAGE_ENDORSEMENT_SLOT'; END IF;
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
  'adsterra_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY coalesce(x.value->>'page','legacy'),(x.value->>'slot')::integer),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(s.adsterra_slots,'[]'::jsonb)) x(value)
    WHERE coalesce((x.value->>'enabled')::boolean,false)=true
      AND ((x.value->>'page') IN ('task1','task2','task3','final') AND coalesce(x.value->>'slot','') ~ '^[1-7]$'
        OR (x.value->>'page') IS NULL AND coalesce(x.value->>'slot','') ~ '^(10|[1-9])$')),
  'endorsement_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY coalesce(x.value->>'page','legacy'),(x.value->>'slot')::integer),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(s.endorsement_slots,'[]'::jsonb)) x(value)
    WHERE coalesce((x.value->>'enabled')::boolean,false)=true
      AND ((x.value->>'page') IN ('task1','task2','task3','final') AND coalesce(x.value->>'slot','') ~ '^[1-2]$'
        OR (x.value->>'page') IS NULL AND coalesce(x.value->>'slot','') ~ '^[1-5]$'))
 ) FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;
