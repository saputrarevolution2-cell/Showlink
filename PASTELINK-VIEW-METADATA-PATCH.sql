-- ShowLink PasteLink metadata and expired-state patch.
-- Run this in Supabase SQL Editor after deploying the frontend files.
-- Expired rows return metadata only; content is never returned for expired pastes.
create or replace function public.get_pastelink(p_slug text, p_password text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  r public.pastelinks%rowtype;
begin
  select * into r from public.pastelinks where slug = p_slug limit 1;
  if not found then
    return null;
  end if;

  if r.expires_at is not null and r.expires_at <= now() then
    return jsonb_build_object(
      'slug', r.slug,
      'title', r.title,
      'created_at', r.created_at,
      'expires_at', r.expires_at,
      'views', coalesce(r.views, 0),
      'expired', true,
      'password_required', false
    );
  end if;

  if r.password_hash is not null and
     (p_password is null or extensions.crypt(p_password, r.password_hash) <> r.password_hash) then
    return jsonb_build_object(
      'slug', r.slug,
      'title', r.title,
      'password_required', true,
      'created_at', r.created_at,
      'expires_at', r.expires_at,
      'views', coalesce(r.views, 0),
      'expired', false
    );
  end if;

  update public.pastelinks set views = coalesce(views, 0) + 1 where id = r.id returning * into r;
  return jsonb_build_object(
    'slug', r.slug,
    'title', r.title,
    'content', r.content,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'views', coalesce(r.views, 0),
    'expired', false,
    'password_required', false
  );
end;
$$;
revoke all on function public.get_pastelink(text, text) from public;
grant execute on function public.get_pastelink(text, text) to anon, authenticated;
