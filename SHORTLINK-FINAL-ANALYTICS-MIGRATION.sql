-- ShowLink Shortlink Final analytics. Run once in Supabase SQL Editor after SHORTLINK-SUPABASE-MIGRATION.sql.
-- Tracks Final page views, Download checks, GO redirects and CPM-based earnings only on GO.
create table if not exists public.shortlink_final_analytics_daily (
  shortlink_id uuid not null references public.shortlinks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  event_date date not null default (timezone('utc', now()))::date,
  views bigint not null default 0 check (views >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  redirects bigint not null default 0 check (redirects >= 0),
  revenue numeric(14,4) not null default 0 check (revenue >= 0),
  updated_at timestamptz not null default now(),
  primary key (shortlink_id, event_date)
);
create index if not exists shortlink_final_analytics_owner_date_idx on public.shortlink_final_analytics_daily(owner_id, event_date desc);
alter table public.shortlink_final_analytics_daily enable row level security;
drop policy if exists "Owners can view own shortlink final analytics" on public.shortlink_final_analytics_daily;
create policy "Owners can view own shortlink final analytics" on public.shortlink_final_analytics_daily for select to authenticated using (owner_id = auth.uid());
revoke all on public.shortlink_final_analytics_daily from anon, authenticated;
grant select on public.shortlink_final_analytics_daily to authenticated;

create or replace function public.record_shortlink_final_event(p_slug text, p_event text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_link public.shortlinks%rowtype;
  v_cpm numeric := 0;
  v_revenue numeric := 0;
  v_day date := (timezone('utc', now()))::date;
begin
  if p_event not in ('view','click','redirect') then raise exception 'INVALID_SHORTLINK_FINAL_EVENT'; end if;
  select * into v_link from public.shortlinks where slug = p_slug;
  if not found then raise exception 'SHORTLINK_NOT_FOUND'; end if;
  if p_event = 'redirect' then
    -- CPM is controlled by the admin settings; earnings accrue only after an explicit GO click.
    begin
      select coalesce(cpm,0) into v_cpm from public.showlink_admin_settings order by updated_at desc nulls last limit 1;
    exception when undefined_table or undefined_column then v_cpm := 0;
    end;
    v_revenue := greatest(coalesce(v_cpm,0),0) / 1000.0;
  end if;
  insert into public.shortlink_final_analytics_daily as current(shortlink_id,owner_id,slug,event_date,views,clicks,redirects,revenue,updated_at)
  values(v_link.id,v_link.owner_id,v_link.slug,v_day,
    case when p_event='view' then 1 else 0 end,
    case when p_event='click' then 1 else 0 end,
    case when p_event='redirect' then 1 else 0 end,
    v_revenue,now())
  on conflict(shortlink_id,event_date) do update set
    views=current.views + excluded.views,
    clicks=current.clicks + excluded.clicks,
    redirects=current.redirects + excluded.redirects,
    revenue=current.revenue + excluded.revenue,
    updated_at=now();
  return jsonb_build_object('ok',true,'event',p_event);
end; $$;
revoke all on function public.record_shortlink_final_event(text,text) from public;
grant execute on function public.record_shortlink_final_event(text,text) to anon, authenticated;

create or replace function public.get_my_shortlink_final_analytics()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select jsonb_build_object(
    'views',coalesce(sum(views),0),
    'clicks',coalesce(sum(clicks),0),
    'redirects',coalesce(sum(redirects),0),
    'revenue',coalesce(sum(revenue),0)
  ) into result from public.shortlink_final_analytics_daily where owner_id=uid;
  return coalesce(result,'{"views":0,"clicks":0,"redirects":0,"revenue":0}'::jsonb);
end; $$;
revoke all on function public.get_my_shortlink_final_analytics() from public;
grant execute on function public.get_my_shortlink_final_analytics() to authenticated;
