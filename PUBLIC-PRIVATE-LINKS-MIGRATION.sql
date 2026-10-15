-- ShowLink public/private visibility for PasteLink, Payment Link, and Shortlink.
-- Run this file in Supabase SQL Editor after deploying the ZIP.
begin;

alter table public.pastelinks add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));
alter table public.shortlinks add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));
alter table public.payment_links add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));

-- Reuse the existing migration file: add only columns required by the current directory.
-- PasteLink owner_id is already used by the existing analytics RPC.
alter table public.pastelinks add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- View counters used by the public directory (safe for existing installations).
alter table public.pastelinks add column if not exists views bigint not null default 0;
alter table public.shortlinks add column if not exists views bigint not null default 0;
alter table public.payment_links add column if not exists views bigint not null default 0;

-- Remove the older 4-argument overload to avoid ambiguous PostgREST RPC resolution.
drop function if exists public.create_pastelink(text,text,text,integer);

-- Keep password/expiry behavior, and preserve owner ownership for analytics.
create or replace function public.create_pastelink(
 p_title text, p_content text, p_password text default null,
 p_expiry_hours integer default null, p_visibility text default 'public'
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare s text; i int; j int; alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; exp timestamptz; vis text;
begin
 if p_content is null or length(trim(p_content))=0 or length(p_content)>20000 then raise exception 'Isi PasteLink wajib diisi (maksimal 20000 karakter).'; end if;
 if p_password is not null and length(p_password)>100 then raise exception 'Password maksimal 100 karakter.'; end if;
 if p_expiry_hours is not null and p_expiry_hours not in (1,24,168,720) then raise exception 'Masa berlaku tidak valid.'; end if;
 vis := case when p_visibility='private' then 'private' else 'public' end;
 if p_expiry_hours is not null then exp := now() + make_interval(hours => p_expiry_hours); end if;
 for i in 1..12 loop
   s := ''; for j in 1..3 loop s := s || substr(alphabet, 1+floor(random()*length(alphabet))::int,1); end loop;
   begin
    insert into public.pastelinks(slug,title,content,password_hash,expires_at,visibility,owner_id)
    values(s,coalesce(nullif(left(trim(p_title),120),''),'PasteLink'),p_content,
      case when nullif(p_password,'') is null then null else extensions.crypt(p_password,extensions.gen_salt('bf')) end, exp,vis,auth.uid());
    return jsonb_build_object('slug',s,'expires_at',exp,'password_protected',nullif(p_password,'') is not null,'visibility',vis);
   exception when unique_violation then continue; end;
 end loop;
 raise exception 'Gagal membuat slug unik, coba lagi.';
end; $$;
revoke all on function public.create_pastelink(text,text,text,integer,text) from public;
grant execute on function public.create_pastelink(text,text,text,integer,text) to anon,authenticated;

-- Rebuild the existing payment-link RPC with its current validation and visibility field.
create or replace function public.create_payment_link(
 p_title text, p_description text, p_price numeric,
 p_content_html text default '', p_content_text text default '',
 p_thumbnail_url text default null, p_visibility text default 'public'
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_id uuid; v_slug text; vis text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if exists (select 1 from public.profiles where id=auth.uid() and is_banned=true) then raise exception 'ACCOUNT_BANNED'; end if;
 if p_title is null or length(trim(p_title))=0 then raise exception 'INVALID_TITLE'; end if;
 if p_content_text is null or length(trim(p_content_text))=0 then raise exception 'INVALID_CONTENT'; end if;
 if p_price is null or p_price < 2000 or p_price > 100000 then raise exception 'INVALID_PRICE: Payment Link price must be between Rp2,000 and Rp100,000'; end if;
 vis := case when p_visibility='private' then 'private' else 'public' end;
 v_slug := public.showlink_random_slug(6);
 insert into public.payment_links(owner_id,slug,title,description,price,content_html,content_text,thumbnail_url,status,published_at,visibility)
 values(auth.uid(),v_slug,trim(p_title),coalesce(p_description,''),p_price,coalesce(p_content_html,''),coalesce(p_content_text,''),p_thumbnail_url,'active',now(),vis)
 returning id into v_id;
 return jsonb_build_object('id',v_id,'slug',v_slug,'url','https://showlink.my.id/p/'||v_slug,'checkout_url','https://showlink.my.id/p/'||v_slug,'visibility',vis);
end; $$;
revoke all on function public.create_payment_link(text,text,numeric,text,text,text) from public,anon,authenticated;
revoke all on function public.create_payment_link(text,text,numeric,text,text,text,text) from public,anon;
grant execute on function public.create_payment_link(text,text,numeric,text,text,text,text) to authenticated;

-- Public directory only returns metadata, never content or secrets.
create or replace function public.get_all_public_links()
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb)
 from (
   select jsonb_build_object('type','Pastelink','title',title,'url','https://showlink.my.id/a/'||slug,'created_at',created_at,'views',coalesce(views,0)) as item, created_at
   from public.pastelinks where visibility='public' and (expires_at is null or expires_at>now())
   union all
   select jsonb_build_object('type','Payment Link','title',title,'url','https://showlink.my.id/p/'||slug,'created_at',coalesce(published_at,created_at),'views',coalesce(views,0),'sales_count',coalesce(sales_count,0)) as item, coalesce(published_at,created_at) as created_at
   from public.payment_links where visibility='public' and status='active'
   union all
   select jsonb_build_object('type','Shortlink','title',coalesce(title,slug),'url','https://showlink.my.id/s/'||slug,'created_at',created_at,'views',coalesce(views,0),'clicks',coalesce(clicks,0)) as item, created_at
   from public.shortlinks where visibility='public'
 ) public_items;
$$;
revoke all on function public.get_all_public_links() from public;
grant execute on function public.get_all_public_links() to anon,authenticated;
commit;
