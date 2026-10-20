-- ShowLink Endorse Inbox Clarity: save chat/image immediately, then update same request.
-- Run after SHORTLINK-ENDORSE-BOT-MIGRATION.sql.
ALTER TABLE public.showlink_endorse_requests
  ADD COLUMN IF NOT EXISTS client_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS showlink_endorse_requests_client_token_uidx
  ON public.showlink_endorse_requests(client_token) WHERE client_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_public_endorse_draft(
  p_client_token uuid,
  p_contact_name text,
  p_question text,
  p_chat_transcript jsonb,
  p_image_url text,
  p_target_url text,
  p_payment_proof_url text,
  p_page text,
  p_position text,
  p_status text DEFAULT 'queued'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  v_prices jsonb;
  v_amount numeric(12,2);
  v_request_id uuid;
BEGIN
  IF p_client_token IS NULL THEN RAISE EXCEPTION 'CLIENT_TOKEN_REQUIRED'; END IF;
  IF p_page NOT IN ('go','final') OR p_position NOT IN ('top','middle','bottom') THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
  IF p_status NOT IN ('pending','queued') THEN RAISE EXCEPTION 'INVALID_REQUEST_STATUS'; END IF;
  IF p_image_url IS NOT NULL AND p_image_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_IMAGE_URL'; END IF;
  IF p_target_url IS NOT NULL AND p_target_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_TARGET_URL'; END IF;
  IF p_payment_proof_url IS NOT NULL AND p_payment_proof_url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_PROOF_URL'; END IF;
  IF jsonb_typeof(coalesce(p_chat_transcript,'[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'INVALID_CHAT_TRANSCRIPT'; END IF;
  IF jsonb_array_length(coalesce(p_chat_transcript,'[]'::jsonb)) > 150 THEN RAISE EXCEPTION 'CHAT_TOO_LONG'; END IF;

  SELECT endorse_slot_prices INTO v_prices FROM public.showlink_admin_settings WHERE id=true;
  v_amount := CASE WHEN p_image_url IS NULL THEN 0 ELSE coalesce((v_prices #>> ARRAY[p_page,p_position])::numeric,0) END;

  INSERT INTO public.showlink_endorse_requests
    (client_token,contact_name,question,chat_transcript,image_url,target_url,payment_proof_url,page,position,amount,status)
  VALUES
    (p_client_token,left(coalesce(nullif(trim(p_contact_name),''),'Pengunjung'),120),left(coalesce(p_question,''),3000),coalesce(p_chat_transcript,'[]'::jsonb),p_image_url,p_target_url,p_payment_proof_url,p_page,p_position,v_amount,p_status)
  ON CONFLICT (client_token) WHERE client_token IS NOT NULL
  DO UPDATE SET
    contact_name=excluded.contact_name,
    question=excluded.question,
    chat_transcript=excluded.chat_transcript,
    image_url=coalesce(excluded.image_url,public.showlink_endorse_requests.image_url),
    target_url=coalesce(excluded.target_url,public.showlink_endorse_requests.target_url),
    payment_proof_url=coalesce(excluded.payment_proof_url,public.showlink_endorse_requests.payment_proof_url),
    page=excluded.page,
    position=excluded.position,
    amount=excluded.amount,
    status=excluded.status,
    updated_at=now()
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('ok',true,'id',v_request_id,'amount',v_amount,'status',p_status);
END; $$;
REVOKE ALL ON FUNCTION public.save_public_endorse_draft(uuid,text,text,jsonb,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_public_endorse_draft(uuid,text,text,jsonb,text,text,text,text,text,text) TO anon,authenticated;
