-- ShowLink Endorse: admin delete request + unpublish from public slots.
-- Run in Supabase SQL Editor after SHORTLINK-ENDORSE-BOT-MIGRATION.sql.
-- The browser removes physical files through Supabase Storage API first; this RPC then deletes the request row.

CREATE OR REPLACE FUNCTION public.admin_delete_endorse_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE v_page text; v_position text;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  DELETE FROM public.showlink_endorse_requests
   WHERE id=p_request_id
   RETURNING page, position INTO v_page, v_position;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  RETURN jsonb_build_object('ok',true,'deleted',true,'page',v_page,'position',v_position);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_endorse_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_endorse_request(uuid) TO authenticated;

-- Allow authenticated admins only to remove files from the Endorse bucket via Storage API.
DROP POLICY IF EXISTS "ShowLink admins delete endorse assets" ON storage.objects;
CREATE POLICY "ShowLink admins delete endorse assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='showlink-endorsements' AND public.is_current_user_admin());
