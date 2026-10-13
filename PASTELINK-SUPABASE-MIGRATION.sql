-- ShowLink PasteLink migration with optional password and expiration.
-- Run this updated SQL in Supabase SQL Editor after backing up any existing data.
create extension if not exists pgcrypto;

create table if not exists public.pastelinks (
 id bigint generated always as identity primary key,
 slug text not null unique check (slug ~ '^[A-Za-z0-9]{3,12}$'),
 title text not null default 'PasteLink',
 content text not null check (char_length(content) between 1 and 20000),
 created_at timestamptz not null default now(),
 password_hash text,
 expires_at timestamptz
);
alter table public.pastelinks add column if not exists password_hash text;
alter table public.pastelinks add column if not exists expires_at timestamptz;
alter table public.pastelinks enable row level security;
revoke all on public.pastelinks from anon, authenticated;

drop function if exists public.create_pastelink(text,text);
drop function if exists public.create_pastelink(text,text,text,integer);
drop function if exists public.get_pastelink(text);
drop function if exists public.get_pastelink(text,text);

create or replace function public.create_pastelink(
 p_title text, p_content text, p_password text default null, p_expiry_hours integer default null
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare s text; i int; alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; exp timestamptz;
begin
 if p_content is null or length(trim(p_content))=0 or length(p_content)>20000 then raise exception 'Isi PasteLink wajib diisi (maksimal 20000 karakter).'; end if;
 if p_password is not null and length(p_password)>100 then raise exception 'Password maksimal 100 karakter.'; end if;
 if p_expiry_hours is not null and p_expiry_hours not in (1,24,168,720) then raise exception 'Masa berlaku tidak valid.'; end if;
 if p_expiry_hours is not null then exp := now() + make_interval(hours => p_expiry_hours); end if;
 for i in 1..8 loop
   s := ''; for j in 1..3 loop s := s || substr(alphabet, 1+floor(random()*length(alphabet))::int,1); end loop;
   begin
    insert into public.pastelinks(slug,title,content,password_hash,expires_at)
    values(s,coalesce(nullif(left(trim(p_title),120),''),'PasteLink'),p_content,
      case when nullif(p_password,'') is null then null else extensions.crypt(p_password,extensions.gen_salt('bf')) end, exp);
    return jsonb_build_object('slug',s,'expires_at',exp,'password_protected',nullif(p_password,'') is not null);
   exception when unique_violation then continue; end;
 end loop;
 raise exception 'Gagal membuat slug unik, coba lagi.';
end; $$;

create or replace function public.get_pastelink(p_slug text, p_password text default null)
returns jsonb language plpgsql stable security definer set search_path=public,extensions as $$
declare r public.pastelinks%rowtype;
begin
 select * into r from public.pastelinks where slug=p_slug limit 1;
 if not found or (r.expires_at is not null and r.expires_at <= now()) then return null; end if;
 if r.password_hash is not null and (p_password is null or extensions.crypt(p_password,r.password_hash) <> r.password_hash) then
  return jsonb_build_object('slug',r.slug,'title',r.title,'password_required',true,'expires_at',r.expires_at);
 end if;
 return jsonb_build_object('slug',r.slug,'title',r.title,'content',r.content,'created_at',r.created_at,'expires_at',r.expires_at,'password_required',false);
end; $$;

revoke all on function public.create_pastelink(text,text) from public;
revoke all on function public.get_pastelink(text) from public;
revoke all on function public.get_pastelink(text,text) from public;
grant execute on function public.create_pastelink(text,text,text,integer) to anon, authenticated;
grant execute on function public.get_pastelink(text,text) to anon, authenticated;
