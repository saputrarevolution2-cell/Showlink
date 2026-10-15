-- PasteLink owner analytics for ShowLink.
-- Run in Supabase SQL Editor. Existing PasteLinks without owner_id remain unassigned
-- and will not appear in personal dashboard statistics.
alter table public.pastelinks add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.pastelinks add column if not exists views bigint not null default 0;
create index if not exists pastelinks_owner_id_idx on public.pastelinks(owner_id);

-- Replace creation RPC: newly created PasteLinks are tied to the signed-in user.
create or replace function public.create_pastelink(
 p_title text, p_content text, p_password text default null, p_expiry_hours integer default null
) returns jsonb language plpgsql security definer set search_path=public,extensions,auth as $$
declare s text; i int; alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; exp timestamptz; owner uuid := auth.uid();
begin
 if p_content is null or length(trim(p_content))=0 or length(p_content)>20000 then raise exception 'Isi PasteLink wajib diisi (maksimal 20000 karakter).'; end if;
 if p_password is not null and length(p_password)>100 then raise exception 'Password maksimal 100 karakter.'; end if;
 if p_expiry_hours is not null and p_expiry_hours not in (1,24,168,720) then raise exception 'Masa berlaku tidak valid.'; end if;
 if p_expiry_hours is not null then exp := now() + make_interval(hours => p_expiry_hours); end if;
 for i in 1..8 loop
   s := ''; for j in 1..3 loop s := s || substr(alphabet, 1+floor(random()*length(alphabet))::int,1); end loop;
   begin
    insert into public.pastelinks(slug,title,content,password_hash,expires_at,owner_id,views)
    values(s,coalesce(nullif(left(trim(p_title),120),''),'PasteLink'),p_content,
      case when nullif(p_password,'') is null then null else extensions.crypt(p_password,extensions.gen_salt('bf')) end, exp, owner, 0);
    return jsonb_build_object('slug',s,'expires_at',exp,'password_protected',nullif(p_password,'') is not null);
   exception when unique_violation then continue; end;
 end loop;
 raise exception 'Gagal membuat slug unik, coba lagi.';
end; $$;

-- Increment views only when content is successfully returned (not on wrong-password attempts).
create or replace function public.get_pastelink(p_slug text, p_password text default null)
returns jsonb language plpgsql volatile security definer set search_path=public,extensions as $$
declare r public.pastelinks%rowtype;
begin
 select * into r from public.pastelinks where slug=p_slug limit 1;
 if not found or (r.expires_at is not null and r.expires_at <= now()) then return null; end if;
 if r.password_hash is not null and (p_password is null or extensions.crypt(p_password,r.password_hash) <> r.password_hash) then
  return jsonb_build_object('slug',r.slug,'title',r.title,'password_required',true,'expires_at',r.expires_at);
 end if;
 update public.pastelinks set views=views+1 where id=r.id returning * into r;
 return jsonb_build_object('slug',r.slug,'title',r.title,'content',r.content,'created_at',r.created_at,'expires_at',r.expires_at,'password_required',false);
end; $$;

-- The table remains inaccessible directly to browser roles. Creation and view reads are through RPCs.
revoke all on public.pastelinks from anon, authenticated;
revoke all on function public.create_pastelink(text,text,text,integer) from public;
grant execute on function public.create_pastelink(text,text,text,integer) to anon, authenticated;
revoke all on function public.get_pastelink(text,text) from public;
grant execute on function public.get_pastelink(text,text) to anon, authenticated;

-- Daily view history supports real up/down comparisons in the dashboard.
create table if not exists public.pastelink_view_daily (
  pastelink_id bigint not null references public.pastelinks(id) on delete cascade,
  view_date date not null default (timezone('utc',now())::date),
  view_count bigint not null default 0,
  primary key (pastelink_id, view_date)
);
revoke all on public.pastelink_view_daily from anon, authenticated;

create or replace function public.get_pastelink(p_slug text, p_password text default null)
returns jsonb language plpgsql volatile security definer set search_path=public,extensions as $$
declare r public.pastelinks%rowtype;
begin
 select * into r from public.pastelinks where slug=p_slug limit 1;
 if not found or (r.expires_at is not null and r.expires_at <= now()) then return null; end if;
 if r.password_hash is not null and (p_password is null or extensions.crypt(p_password,r.password_hash) <> r.password_hash) then
  return jsonb_build_object('slug',r.slug,'title',r.title,'password_required',true,'expires_at',r.expires_at);
 end if;
 update public.pastelinks set views=views+1 where id=r.id returning * into r;
 insert into public.pastelink_view_daily(pastelink_id,view_date,view_count) values(r.id,timezone('utc',now())::date,1)
 on conflict(pastelink_id,view_date) do update set view_count=public.pastelink_view_daily.view_count+1;
 return jsonb_build_object('slug',r.slug,'title',r.title,'content',r.content,'created_at',r.created_at,'expires_at',r.expires_at,'password_required',false);
end; $$;
revoke all on function public.get_pastelink(text,text) from public;
grant execute on function public.get_pastelink(text,text) to anon, authenticated;

-- Authenticated owner-only read API for dashboard PasteLink stats and view history.
create or replace function public.get_my_pastelink_analytics()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 return jsonb_build_object(
  'links',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'created_at',p.created_at,'views',p.views) order by p.created_at desc),'[]'::jsonb) from public.pastelinks p where p.owner_id=uid),
  'current_period_views',(select coalesce(sum(d.view_count),0) from public.pastelink_view_daily d join public.pastelinks p on p.id=d.pastelink_id where p.owner_id=uid and d.view_date >= timezone('utc',now())::date-6),
  'previous_period_views',(select coalesce(sum(d.view_count),0) from public.pastelink_view_daily d join public.pastelinks p on p.id=d.pastelink_id where p.owner_id=uid and d.view_date >= timezone('utc',now())::date-13 and d.view_date < timezone('utc',now())::date-6)
 );
end; $$;
revoke all on function public.get_my_pastelink_analytics() from public;
grant execute on function public.get_my_pastelink_analytics() to authenticated;
