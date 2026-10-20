-- PasteLink View metadata patch for ShowLink.
-- Run in Supabase SQL Editor if get_pastelink currently does not return `views`.
-- Keeps the existing password validation and increments views only after successful access.
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
  if not found or (r.expires_at is not null and r.expires_at <= now()) then
    return null;
  end if;

  if r.password_hash is not null and
     (p_password is null or extensions.crypt(p_password, r.password_hash) <> r.password_hash) then
    return jsonb_build_object(
      'slug', r.slug,
      'title', r.title,
      'password_required', true,
      'created_at', r.created_at,
      'expires_at', r.expires_at,
      'views', r.views
    );
  end if;

  update public.pastelinks set views = views + 1 where id = r.id returning * into r;
  return jsonb_build_object(
    'slug', r.slug,
    'title', r.title,
    'content', r.content,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'views', r.views,
    'password_required', false
  );
end;
$$;
revoke all on function public.get_pastelink(text, text) from public;
grant execute on function public.get_pastelink(text, text) to anon, authenticated;
