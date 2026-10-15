-- PasteLink management RPCs for the Kelola Tautan page.
-- Run this file in Supabase SQL Editor after PASTELINK-ANALYTICS-MIGRATION.sql.
create or replace function public.get_my_pastelinks()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'slug',p.slug,'title',p.title,'content',p.content,'created_at',p.created_at,
   'expires_at',p.expires_at,'password_protected',p.password_hash is not null
 ) order by p.created_at desc) from public.pastelinks p where p.owner_id=auth.uid()),'[]'::jsonb);
end; $$;
create or replace function public.update_pastelink(
 p_slug text,p_title text,p_content text,p_password text default null
) returns jsonb language plpgsql security definer set search_path=public,extensions,auth as $$
declare r public.pastelinks%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_content is null or length(trim(p_content))=0 or length(p_content)>20000 then raise exception 'Isi PasteLink wajib diisi (maksimal 20000 karakter).'; end if;
 if p_password is not null and length(p_password)>100 then raise exception 'Password maksimal 100 karakter.'; end if;
 update public.pastelinks set title=coalesce(nullif(left(trim(p_title),120),''),'PasteLink'),
   content=p_content,
   password_hash=case when p_password is null then password_hash when p_password='' then null else extensions.crypt(p_password,extensions.gen_salt('bf')) end
 where slug=p_slug and owner_id=auth.uid() returning * into r;
 if not found then raise exception 'PasteLink tidak ditemukan atau bukan milik akun ini.'; end if;
 return jsonb_build_object('slug',r.slug,'title',r.title);
end; $$;
create or replace function public.delete_pastelink(p_slug text)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from public.pastelinks where slug=p_slug and owner_id=auth.uid();
 get diagnostics n = row_count;
 if n=0 then raise exception 'PasteLink tidak ditemukan atau bukan milik akun ini.'; end if;
 return true;
end; $$;
revoke all on function public.get_my_pastelinks() from public,anon;
revoke all on function public.update_pastelink(text,text,text,text) from public,anon;
revoke all on function public.delete_pastelink(text) from public,anon;
grant execute on function public.get_my_pastelinks() to authenticated;
grant execute on function public.update_pastelink(text,text,text,text) to authenticated;
grant execute on function public.delete_pastelink(text) to authenticated;
