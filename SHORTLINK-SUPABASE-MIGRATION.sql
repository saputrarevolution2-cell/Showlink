-- ShowLink Shortlink: run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.shortlinks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 slug text not null unique check (slug ~ '^[A-Za-z0-9_-]{3,40}$'),
 title text,
 destination_url text not null check (destination_url ~* '^https?://'),
 clicks bigint not null default 0 check (clicks >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists shortlinks_owner_created_idx on public.shortlinks(owner_id, created_at desc);
alter table public.shortlinks enable row level security;
drop policy if exists "Owners can view own shortlinks" on public.shortlinks;
drop policy if exists "Owners can create own shortlinks" on public.shortlinks;
drop policy if exists "Owners can update own shortlinks" on public.shortlinks;
drop policy if exists "Owners can delete own shortlinks" on public.shortlinks;
create policy "Owners can view own shortlinks" on public.shortlinks for select to authenticated using (owner_id = auth.uid());
create policy "Owners can create own shortlinks" on public.shortlinks for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners can update own shortlinks" on public.shortlinks for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners can delete own shortlinks" on public.shortlinks for delete to authenticated using (owner_id = auth.uid());
revoke all on public.shortlinks from anon;
grant select,insert,update,delete on public.shortlinks to authenticated;
create or replace function public.resolve_shortlink(p_slug text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_url text;
begin
 update public.shortlinks set clicks=clicks+1, updated_at=now() where slug=p_slug returning destination_url into v_url;
 if v_url is null then return null; end if;
 return jsonb_build_object('destination_url',v_url);
end; $$;
revoke all on function public.resolve_shortlink(text) from public;
grant execute on function public.resolve_shortlink(text) to anon, authenticated;


-- Multi-page shortlink flow fields (safe to re-run)
alter table public.shortlinks add column if not exists content_url text;
alter table public.shortlinks add column if not exists access_price numeric(12,2) not null default 0 check(access_price>=0);
alter table public.shortlinks add column if not exists free_enabled boolean not null default true;
alter table public.shortlinks add column if not exists views bigint not null default 0;
update public.shortlinks set content_url=destination_url where content_url is null;
create or replace function public.get_shortlink_public(p_slug text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.shortlinks%rowtype; begin select * into v from public.shortlinks where slug=p_slug; if not found then return null; end if; update public.shortlinks set views=views+1 where id=v.id; return jsonb_build_object('slug',v.slug,'title',v.title,'content_url',coalesce(v.content_url,v.destination_url),'access_price',v.access_price,'free_enabled',v.free_enabled); end; $$;
revoke all on function public.get_shortlink_public(text) from public; grant execute on function public.get_shortlink_public(text) to anon,authenticated;
