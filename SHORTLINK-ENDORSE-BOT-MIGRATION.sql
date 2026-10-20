-- ShowLink Endorse Bot: slot pricing, public requests, admin review and publication.
-- Run once in Supabase SQL Editor. This first version uses manual payment-proof review;
-- it does NOT mark a request as paid based on a browser-side claim.

ALTER TABLE public.showlink_admin_settings
  ADD COLUMN IF NOT EXISTS endorse_slot_prices jsonb NOT NULL DEFAULT '{"go":{"top":2000,"middle":2000,"bottom":2000},"final":{"top":2000,"middle":2000,"bottom":2000}}'::jsonb;



CREATE TABLE IF NOT EXISTS public.showlink_endorse_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL DEFAULT 'Pengunjung',
  question text NOT NULL DEFAULT '',
  chat_transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  target_url text,
  payment_proof_url text,
  page text NOT NULL CHECK (page IN ('go','final')),
  position text NOT NULL CHECK (position IN ('top','middle','bottom')),
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','queued','approved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS showlink_endorse_requests_status_created_idx ON public.showlink_endorse_requests(status, created_at DESC);

-- Existing Admin UI can configure more than five placements; raise the JSON limit to 10.
CREATE OR REPLACE FUNCTION public.admin_save_control_center_settings(
 p_cpm numeric, p_navbar_visibility jsonb, p_adsterra_slots jsonb,
 p_image_ad_enabled boolean, p_image_ad_url text, p_image_ad_target_url text,
 p_shortlink_redirect_enabled boolean, p_shortlink_redirect_label text,
 p_shortlink_redirect_url text, p_shortlink_flow jsonb, p_endorsement_slots jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_slots jsonb; v_endorsements jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_cpm IS NULL OR p_cpm < 0 OR p_cpm > 1000000 THEN RAISE EXCEPTION 'CPM_INVALID'; END IF;
 IF jsonb_typeof(coalesce(p_adsterra_slots,'[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(p_adsterra_slots,'[]'::jsonb)) > 10 THEN RAISE EXCEPTION 'INVALID_ADSTERRA_SLOTS'; END IF;
 IF jsonb_typeof(coalesce(p_endorsement_slots,'[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(p_endorsement_slots,'[]'::jsonb)) > 10 THEN RAISE EXCEPTION 'MAX_10_ENDORSEMENT_SLOTS'; END IF;
 v_slots := coalesce(p_adsterra_slots,'[]'::jsonb); v_endorsements := coalesce(p_endorsement_slots,'[]'::jsonb);
 UPDATE public.showlink_admin_settings SET cpm=p_cpm,navbar_visibility=coalesce(p_navbar_visibility,'{}'::jsonb),adsterra_slots=v_slots,
  image_ad_enabled=coalesce(p_image_ad_enabled,false),image_ad_url=left(coalesce(p_image_ad_url,''),2000),image_ad_target_url=left(coalesce(p_image_ad_target_url,''),2000),
  shortlink_redirect_enabled=coalesce(p_shortlink_redirect_enabled,true),shortlink_redirect_label=left(coalesce(nullif(trim(p_shortlink_redirect_label),''),'Lanjutkan'),80),
  shortlink_redirect_url=left(coalesce(p_shortlink_redirect_url,''),2000),shortlink_flow=coalesce(p_shortlink_flow,'{"task1":true,"task2":true,"task3":true}'::jsonb),
  endorsement_slots=v_endorsements,updated_at=now(),updated_by=auth.uid() WHERE id=true;
 RETURN jsonb_build_object('ok',true,'adsterra_slot_count',jsonb_array_length(v_slots),'endorsement_slot_count',jsonb_array_length(v_endorsements));
END; $$;
REVOKE ALL ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_control_center_settings(numeric,jsonb,jsonb,boolean,text,text,boolean,text,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_shortlink_control_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
 SELECT jsonb_build_object(
  'cpm',s.cpm,'navbar_visibility',s.navbar_visibility,'image_ad_enabled',s.image_ad_enabled,'image_ad_url',s.image_ad_url,
  'image_ad_target_url',s.image_ad_target_url,'shortlink_redirect_enabled',s.shortlink_redirect_enabled,'shortlink_redirect_label',s.shortlink_redirect_label,
  'shortlink_redirect_url',s.shortlink_redirect_url,'shortlink_flow',s.shortlink_flow,
  'adsterra_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY coalesce((x.value->>'slot')::integer,0)),'[]'::jsonb) FROM jsonb_array_elements(s.adsterra_slots) x(value) WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10),
  'endorsement_slots',(SELECT coalesce(jsonb_agg(item ORDER BY coalesce((item->>'slot')::integer,0)),'[]'::jsonb) FROM (
    SELECT x.value AS item FROM jsonb_array_elements(s.endorsement_slots) x(value) WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10
    UNION ALL
    SELECT jsonb_build_object('page',r.page,'position',r.position,'slot',1,'enabled',true,'image_url',r.image_url,'target_url',r.target_url,'alt','Endorse sponsor','title',left(coalesce(r.contact_name,'Endorse sponsor'),80),'request_id',r.id) AS item
    FROM public.showlink_endorse_requests r WHERE r.status='approved'
  ) all_endorsements)
 ) FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;

ALTER TABLE public.showlink_endorse_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.showlink_endorse_requests FROM anon, authenticated, PUBLIC;

-- Public upload bucket. Uploads are images only and capped at 5 MB. Review/admin writes remain RPC-only.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('showlink-endorsements','showlink-endorsements',true,5242880,ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/gif'];
DROP POLICY IF EXISTS "ShowLink public endorse request image uploads" ON storage.objects;
CREATE POLICY "ShowLink public endorse request image uploads" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id='showlink-endorsements' AND (storage.extension(name) IN ('png','jpg','jpeg','webp','gif')));

CREATE OR REPLACE FUNCTION public.get_public_endorse_prices()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
 SELECT jsonb_build_object('prices',coalesce(s.endorse_slot_prices,'{}'::jsonb))
 FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_endorse_prices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_endorse_prices() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_public_endorse_slot_availability()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_slots jsonb; v_busy jsonb;
BEGIN
 SELECT coalesce(endorsement_slots,'[]'::jsonb) INTO v_slots FROM public.showlink_admin_settings WHERE id=true;
 SELECT coalesce(jsonb_agg(jsonb_build_object('page',page,'position',position)),'[]'::jsonb) INTO v_busy
 FROM public.showlink_endorse_requests WHERE status IN ('pending','approved');
 RETURN (SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (
   SELECT jsonb_build_object('page',value->>'page','position',value->>'position') AS x
   FROM jsonb_array_elements(coalesce(v_slots,'[]'::jsonb))
   WHERE coalesce((value->>'enabled')::boolean,false)=true AND value->>'position' IS NOT NULL
   UNION ALL SELECT value AS x FROM jsonb_array_elements(v_busy)
 ) q);
END; $$;
REVOKE ALL ON FUNCTION public.get_public_endorse_slot_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_endorse_slot_availability() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_endorse_request(
 p_contact_name text, p_question text, p_chat_transcript jsonb,
 p_image_url text, p_target_url text, p_payment_proof_url text,
 p_page text, p_position text, p_status text DEFAULT 'pending'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_prices jsonb; v_amount numeric; v_status text;
BEGIN
 IF p_page NOT IN ('go','final') OR p_position NOT IN ('top','middle','bottom') THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
 IF p_status NOT IN ('pending','queued') THEN RAISE EXCEPTION 'INVALID_REQUEST_STATUS'; END IF;
 IF p_image_url IS NOT NULL AND p_image_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_IMAGE_URL'; END IF;
 IF p_target_url IS NOT NULL AND p_target_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_TARGET_URL'; END IF;
 IF p_payment_proof_url IS NOT NULL AND p_payment_proof_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_PROOF_URL'; END IF;
 SELECT endorse_slot_prices INTO v_prices FROM public.showlink_admin_settings WHERE id=true;
 v_amount := CASE WHEN p_image_url IS NULL THEN 0 ELSE coalesce((v_prices #>> ARRAY[p_page,p_position])::numeric,0) END;
 v_status := p_status;
 INSERT INTO public.showlink_endorse_requests(contact_name,question,chat_transcript,image_url,target_url,payment_proof_url,page,position,amount,status)
 VALUES(left(coalesce(nullif(trim(p_contact_name),''),'Pengunjung'),120),left(coalesce(p_question,''),3000),coalesce(p_chat_transcript,'[]'::jsonb),p_image_url,p_target_url,p_payment_proof_url,p_page,p_position,v_amount,v_status);
 RETURN jsonb_build_object('ok',true,'amount',v_amount,'status',v_status);
END; $$;
REVOKE ALL ON FUNCTION public.submit_public_endorse_request(text,text,jsonb,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_endorse_request(text,text,jsonb,text,text,text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_endorse_settings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN (SELECT jsonb_build_object('prices',endorse_slot_prices) FROM public.showlink_admin_settings WHERE id=true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_endorse_settings() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_get_endorse_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_save_endorse_settings(p_prices jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE p text; pos text; v numeric;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF jsonb_typeof(p_prices)<>'object' THEN RAISE EXCEPTION 'INVALID_PRICES'; END IF;
 FOREACH p IN ARRAY ARRAY['go','final'] LOOP
  FOREACH pos IN ARRAY ARRAY['top','middle','bottom'] LOOP
   BEGIN v := (p_prices #>> ARRAY[p,pos])::numeric; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'INVALID_PRICE_%_%',p,pos; END;
   IF v IS NULL OR v<0 OR v>1000000000 THEN RAISE EXCEPTION 'INVALID_PRICE_%_%',p,pos; END IF;
  END LOOP;
 END LOOP;
 UPDATE public.showlink_admin_settings SET endorse_slot_prices=p_prices,updated_at=now(),updated_by=auth.uid() WHERE id=true;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_save_endorse_settings(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_endorse_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_endorse_requests()
RETURNS SETOF public.showlink_endorse_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 RETURN QUERY SELECT * FROM public.showlink_endorse_requests ORDER BY created_at DESC LIMIT 200;
END; $$;
REVOKE ALL ON FUNCTION public.admin_list_endorse_requests() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_endorse_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_endorse_request(p_request_id uuid,p_status text,p_admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r public.showlink_endorse_requests%ROWTYPE; v_slots jsonb; v_item jsonb;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_status NOT IN ('approved','queued','rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT * INTO r FROM public.showlink_endorse_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
 IF p_status='approved' THEN
  IF r.payment_proof_url IS NULL OR r.image_url IS NULL OR r.target_url IS NULL THEN RAISE EXCEPTION 'IMAGE_TARGET_AND_PAYMENT_PROOF_REQUIRED'; END IF;
  SELECT coalesce(endorsement_slots,'[]'::jsonb) INTO v_slots FROM public.showlink_admin_settings WHERE id=true FOR UPDATE;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_slots) e WHERE coalesce((e->>'enabled')::boolean,false)=true AND e->>'page'=r.page AND e->>'position'=r.position) THEN RAISE EXCEPTION 'SLOT_ALREADY_OCCUPIED'; END IF;
  IF EXISTS(SELECT 1 FROM public.showlink_endorse_requests q WHERE q.id<>r.id AND q.page=r.page AND q.position=r.position AND q.status='approved') THEN RAISE EXCEPTION 'SLOT_ALREADY_OCCUPIED'; END IF;
 END IF;
 UPDATE public.showlink_endorse_requests SET status=p_status,admin_note=left(coalesce(p_admin_note,''),1000),updated_at=now() WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'status',p_status);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_endorse_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_endorse_request(uuid,text,text) TO authenticated;
