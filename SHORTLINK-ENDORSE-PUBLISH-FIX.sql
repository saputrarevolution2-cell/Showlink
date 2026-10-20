-- ShowLink Endorse Publish Fix
-- Run AFTER SHORTLINK-ENDORSE-BOT-MIGRATION.sql AND SHORTLINK-ENDORSE-INBOX-CLARITY.sql.
-- Approved requests are automatically included in the public Go/Final endorsement feed.
-- Existing Adsterra settings and manually configured endorsement settings are preserved.

CREATE OR REPLACE FUNCTION public.get_public_shortlink_control_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
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
  'adsterra_slots',(
    SELECT coalesce(jsonb_agg(x.value ORDER BY coalesce((x.value->>'slot')::integer,0)),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(s.adsterra_slots,'[]'::jsonb)) x(value)
    WHERE coalesce((x.value->>'enabled')::boolean,false)=true
      AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10
  ),
  'endorsement_slots',(
    SELECT coalesce(jsonb_agg(all_items.item ORDER BY coalesce((all_items.item->>'slot')::integer,0)),'[]'::jsonb)
    FROM (
      -- Keep manually configured placements. If an approved order occupies the same page/position,
      -- the renderer gives the approved position-specific item priority over legacy items.
      SELECT x.value AS item
      FROM jsonb_array_elements(coalesce(s.endorsement_slots,'[]'::jsonb)) x(value)
      WHERE coalesce((x.value->>'enabled')::boolean,false)=true
        AND coalesce((x.value->>'slot')::integer,0) BETWEEN 1 AND 10
      UNION ALL
      SELECT jsonb_build_object(
        'page',r.page,
        'position',r.position,
        'slot',CASE r.position WHEN 'top' THEN 1 WHEN 'middle' THEN 2 ELSE 3 END,
        'enabled',true,
        'image_url',r.image_url,
        'target_url',r.target_url,
        'alt','Endorse sponsor',
        'title',left(coalesce(nullif(r.contact_name,''),'Endorse sponsor'),80),
        'request_id',r.id
      ) AS item
      FROM public.showlink_endorse_requests r
      WHERE r.status='approved'
        AND r.image_url ~ '^https?://'
        AND r.target_url ~ '^https?://'
    ) all_items
  )
 )
 FROM public.showlink_admin_settings s
 WHERE s.id=true;
$$;
REVOKE ALL ON FUNCTION public.get_public_shortlink_control_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shortlink_control_settings() TO anon,authenticated;

-- Approval publishes the request through get_public_shortlink_control_settings().
-- A slot is unique among approved user orders, but existing admin settings are not a blocker;
-- the approved order is position-specific and is rendered in its requested location.
CREATE OR REPLACE FUNCTION public.admin_update_endorse_request(
 p_request_id uuid,
 p_status text,
 p_admin_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE r public.showlink_endorse_requests%ROWTYPE;
BEGIN
 IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_status NOT IN ('approved','queued','rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
 SELECT * INTO r FROM public.showlink_endorse_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
 IF p_status='approved' THEN
  IF r.payment_proof_url IS NULL OR r.image_url IS NULL OR r.target_url IS NULL THEN
    RAISE EXCEPTION 'IMAGE_TARGET_AND_PAYMENT_PROOF_REQUIRED';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.showlink_endorse_requests q
    WHERE q.id<>r.id AND q.page=r.page AND q.position=r.position AND q.status='approved'
  ) THEN RAISE EXCEPTION 'SLOT_ALREADY_OCCUPIED'; END IF;
 END IF;
 UPDATE public.showlink_endorse_requests
 SET status=p_status,admin_note=left(coalesce(p_admin_note,''),1000),updated_at=now()
 WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'status',p_status,'page',r.page,'position',r.position);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_endorse_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_endorse_request(uuid,text,text) TO authenticated;

-- Make the public slot-availability response account for approved orders and admin-configured placements.
CREATE OR REPLACE FUNCTION public.get_public_endorse_slot_availability()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE v_slots jsonb; v_busy jsonb;
BEGIN
 SELECT coalesce(endorsement_slots,'[]'::jsonb) INTO v_slots
 FROM public.showlink_admin_settings WHERE id=true;
 SELECT coalesce(jsonb_agg(jsonb_build_object('page',page,'position',position)),'[]'::jsonb) INTO v_busy
 FROM public.showlink_endorse_requests WHERE status IN ('pending','approved');
 RETURN (
   SELECT coalesce(jsonb_agg(q.item),'[]'::jsonb)
   FROM (
     SELECT jsonb_build_object('page',x.value->>'page','position',x.value->>'position') AS item
     FROM jsonb_array_elements(coalesce(v_slots,'[]'::jsonb)) x(value)
     WHERE coalesce((x.value->>'enabled')::boolean,false)=true AND x.value->>'position' IS NOT NULL
     UNION ALL SELECT value AS item FROM jsonb_array_elements(v_busy)
   ) q
 );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_endorse_slot_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_endorse_slot_availability() TO anon,authenticated;
