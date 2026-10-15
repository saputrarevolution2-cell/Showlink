-- ShowLink Admin Control Center v23
-- Run in Supabase SQL Editor after existing ShowLink migrations.
CREATE TABLE IF NOT EXISTS public.showlink_admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  cpm numeric(12,4) NOT NULL DEFAULT 1 CHECK (cpm >= 0),
  navbar_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  adsterra_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_ad_enabled boolean NOT NULL DEFAULT false,
  image_ad_url text NOT NULL DEFAULT '',
  image_ad_target_url text NOT NULL DEFAULT '',
  shortlink_redirect_enabled boolean NOT NULL DEFAULT true,
  shortlink_redirect_label text NOT NULL DEFAULT 'Lanjutkan',
  shortlink_redirect_url text NOT NULL DEFAULT '',
  shortlink_flow jsonb NOT NULL DEFAULT '{"task1":true,"task2":true,"task3":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.showlink_admin_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.showlink_admin_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showlink_admin_settings FROM anon, authenticated;
GRANT ALL ON public.showlink_admin_settings TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_control_center_settings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN (SELECT to_jsonb(s) FROM public.showlink_admin_settings s WHERE id=true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_control_center_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_control_center_settings() TO authenticated;

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
 p_shortlink_flow jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_slots jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_cpm IS NULL OR p_cpm < 0 OR p_cpm > 1000000 THEN RAISE EXCEPTION 'CPM_INVALID'; END IF;
 IF jsonb_typeof(coalesce(p_adsterra_slots,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'ADSTERRA_SLOTS_MUST_BE_ARRAY'; END IF;
 IF jsonb_array_length(coalesce(p_adsterra_slots,'[]'::jsonb)) > 12 THEN RAISE EXCEPTION 'MAX_12_ADSTERRA_SLOTS'; END IF;
 v_slots := coalesce(p_adsterra_slots,'[]'::jsonb);
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
   updated_at=now(),updated_by=auth.uid()
 WHERE id=true;
 INSERT INTO public.admin_audit_logs(admin_id,action,target_type,details)
 VALUES(auth.uid(),'save_control_center_settings','platform',jsonb_build_object('cpm',p_cpm,'adsterra_slot_count',jsonb_array_length(v_slots)));
 RETURN jsonb_build_object('ok',true,'adsterra_slot_count',jsonb_array_length(v_slots));
END; $$;
REVOKE ALL ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb) TO authenticated;

-- Public-safe settings for the Shortlink task UI. Ad code is deliberately returned only
-- for enabled slots configured by an authenticated administrator.
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
  'adsterra_slots',(SELECT coalesce(jsonb_agg(x.value),'[]'::jsonb) FROM jsonb_array_elements(s.adsterra_slots) x(value) WHERE coalesce((x.value->>'enabled')::boolean,false)=true)
 ) FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;

-- Admin-only Shortlink moderation.
CREATE OR REPLACE FUNCTION public.admin_shortlinks(p_limit integer DEFAULT 500)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN QUERY SELECT jsonb_build_object('id',s.id,'owner_id',s.owner_id,'slug',s.slug,'title',s.title,
   'destination_url',s.destination_url,'content_url',s.content_url,'clicks',s.clicks,'views',s.views,'access_price',s.access_price,'free_enabled',s.free_enabled,'created_at',s.created_at)
 FROM public.shortlinks s ORDER BY s.created_at DESC LIMIT greatest(1,least(coalesce(p_limit,500),1000));
END; $$;
REVOKE ALL ON FUNCTION public.admin_shortlinks(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_shortlinks(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_shortlink(p_id uuid,p_title text,p_destination_url text,p_content_url text,p_access_price numeric,p_free_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF coalesce(trim(p_title),'')='' OR coalesce(p_destination_url,'') !~* '^https?://' OR coalesce(p_content_url,'') !~* '^https?://' OR coalesce(p_access_price,-1)<0 THEN RAISE EXCEPTION 'INVALID_SHORTLINK_DATA'; END IF;
 UPDATE public.shortlinks SET title=left(trim(p_title),160),destination_url=p_destination_url,content_url=p_content_url,access_price=p_access_price,free_enabled=coalesce(p_free_enabled,true),updated_at=now() WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'SHORTLINK_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_shortlink(uuid,text,text,text,numeric,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_shortlink(uuid,text,text,text,numeric,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_shortlink(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.shortlinks WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'SHORTLINK_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_shortlink(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_shortlink(uuid) TO authenticated;

-- Admin-only PasteLink moderation; do not expose content through public table grants.
CREATE OR REPLACE FUNCTION public.admin_pastelinks(p_limit integer DEFAULT 500)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN QUERY SELECT jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'content',p.content,'created_at',p.created_at,'expires_at',p.expires_at,'password_protected',p.password_hash IS NOT NULL)
 FROM public.pastelinks p ORDER BY p.created_at DESC LIMIT greatest(1,least(coalesce(p_limit,500),1000));
END; $$;
REVOKE ALL ON FUNCTION public.admin_pastelinks(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pastelinks(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_pastelink(p_id bigint,p_title text,p_content text,p_expires_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF coalesce(trim(p_title),'')='' OR coalesce(p_content,'')='' OR length(p_content)>20000 THEN RAISE EXCEPTION 'INVALID_PASTELINK_DATA'; END IF;
 UPDATE public.pastelinks SET title=left(trim(p_title),120),content=p_content,expires_at=p_expires_at WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PASTELINK_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_pastelink(bigint,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_pastelink(bigint,text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_pastelink(p_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 DELETE FROM public.pastelinks WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PASTELINK_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_pastelink(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_pastelink(bigint) TO authenticated;
