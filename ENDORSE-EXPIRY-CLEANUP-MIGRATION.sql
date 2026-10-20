-- ShowLink Endorse expiry and cleanup support.
-- Run after SHORTLINK-ENDORSE-BOT-MIGRATION.sql, SHORTLINK-ENDORSE-INBOX-CLARITY.sql,
-- and SHORTLINK-ENDORSE-PUBLISH-FIX.sql.
-- Default paid campaign duration is 7 days. Admin can adjust expires_at per request.
ALTER TABLE public.showlink_endorse_requests
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 7
    CHECK (duration_days BETWEEN 1 AND 365);

UPDATE public.showlink_endorse_requests
SET starts_at = coalesce(starts_at, updated_at, created_at, now()),
    expires_at = coalesce(expires_at, coalesce(starts_at, updated_at, created_at, now()) + make_interval(days => greatest(1, least(duration_days,365))))
WHERE status = 'approved' AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS showlink_endorse_requests_expiry_idx
  ON public.showlink_endorse_requests(expires_at)
  WHERE status='approved' AND expires_at IS NOT NULL;

-- Approval sets the campaign start/end date; default duration is 7 days.
CREATE OR REPLACE FUNCTION public.admin_update_endorse_request(
 p_request_id uuid, p_status text, p_admin_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r public.showlink_endorse_requests%ROWTYPE; v_start timestamptz; v_end timestamptz;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_status NOT IN ('approved','queued','rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT * INTO r FROM public.showlink_endorse_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
 IF p_status='approved' THEN
   IF r.payment_proof_url IS NULL OR r.image_url IS NULL OR r.target_url IS NULL THEN
     RAISE EXCEPTION 'IMAGE_TARGET_AND_PAYMENT_PROOF_REQUIRED';
   END IF;
   IF EXISTS (SELECT 1 FROM public.showlink_endorse_requests q
      WHERE q.id<>r.id AND q.page=r.page AND q.position=r.position AND q.status='approved'
      AND (q.expires_at IS NULL OR q.expires_at > now())) THEN
     RAISE EXCEPTION 'SLOT_ALREADY_OCCUPIED';
   END IF;
   v_start := now();
   v_end := v_start + make_interval(days => greatest(1,least(coalesce(r.duration_days,7),365)));
 ELSE
   v_start := r.starts_at; v_end := r.expires_at;
 END IF;
 UPDATE public.showlink_endorse_requests
 SET status=p_status, admin_note=left(coalesce(p_admin_note,''),1000),
     starts_at=CASE WHEN p_status='approved' THEN v_start ELSE starts_at END,
     expires_at=CASE WHEN p_status='approved' THEN v_end ELSE expires_at END,
     updated_at=now()
 WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'status',p_status,'page',r.page,'position',r.position,
   'starts_at',v_start,'expires_at',v_end,'duration_days',r.duration_days);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_endorse_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_endorse_request(uuid,text,text) TO authenticated;

-- Expired ads stop appearing even before the cleanup job deletes their files.
CREATE OR REPLACE FUNCTION public.get_public_shortlink_control_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
 SELECT jsonb_build_object(
  'cpm',s.cpm,'navbar_visibility',s.navbar_visibility,'image_ad_enabled',s.image_ad_enabled,
  'image_ad_url',s.image_ad_url,'image_ad_target_url',s.image_ad_target_url,
  'shortlink_redirect_enabled',s.shortlink_redirect_enabled,'shortlink_redirect_label',s.shortlink_redirect_label,
  'shortlink_redirect_url',s.shortlink_redirect_url,'shortlink_flow',s.shortlink_flow,
  'adsterra_slots',(SELECT coalesce(jsonb_agg(x.value ORDER BY coalesce((x.value->>'slot')::integer,0)),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(s.adsterra_slots,'[]'::jsonb)) x(value)
    WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10),
  'endorsement_slots',(SELECT coalesce(jsonb_agg(all_items.item ORDER BY coalesce((all_items.item->>'slot')::integer,0)),'[]'::jsonb)
    FROM (
      SELECT x.value AS item FROM jsonb_array_elements(coalesce(s.endorsement_slots,'[]'::jsonb)) x(value)
      WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10
      UNION ALL
      SELECT jsonb_build_object('page',r.page,'position',r.position,
        'slot',CASE r.position WHEN 'top' THEN 1 WHEN 'middle' THEN 2 ELSE 3 END,
        'enabled',true,'image_url',r.image_url,'target_url',r.target_url,
        'alt','Endorse sponsor','title',left(coalesce(nullif(r.contact_name,''),'Endorse sponsor'),80),'request_id',r.id)
      FROM public.showlink_endorse_requests r
      WHERE r.status='approved' AND (r.expires_at IS NULL OR r.expires_at > now())
        AND r.image_url ~ '^https?://' AND r.target_url ~ '^https?://'
    ) all_items)
 ) FROM public.showlink_admin_settings s WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;

-- Cleanup is performed by the Edge Function included in this patch.
-- Schedule it hourly in Supabase (Edge Functions > endorse-expiry-cleanup) with a secret
-- header x-cleanup-secret matching ENDORSE_CLEANUP_SECRET. Do not expose the service-role key in the browser.

-- Expired approved orders no longer block availability.
CREATE OR REPLACE FUNCTION public.get_public_endorse_slot_availability()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v_slots jsonb; v_busy jsonb;
BEGIN
 SELECT coalesce(endorsement_slots,'[]'::jsonb) INTO v_slots FROM public.showlink_admin_settings WHERE id=true;
 SELECT coalesce(jsonb_agg(jsonb_build_object('page',page,'position',position)),'[]'::jsonb) INTO v_busy
 FROM public.showlink_endorse_requests
 WHERE status IN ('pending','queued') OR (status='approved' AND (expires_at IS NULL OR expires_at > now()));
 RETURN (SELECT coalesce(jsonb_agg(q.item),'[]'::jsonb) FROM (
   SELECT jsonb_build_object('page',x.value->>'page','position',x.value->>'position') AS item
   FROM jsonb_array_elements(coalesce(v_slots,'[]'::jsonb)) x(value)
   WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND x.value->>'position' IS NOT NULL
   UNION ALL SELECT value AS item FROM jsonb_array_elements(v_busy)
 ) q);
END; $$;
REVOKE ALL ON FUNCTION public.get_public_endorse_slot_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_endorse_slot_availability() TO anon,authenticated;
