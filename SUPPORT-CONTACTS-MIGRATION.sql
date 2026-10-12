-- ShowLink public Support contact settings. Run once in Supabase SQL Editor.
create table if not exists public.showlink_support_contacts (
 id integer primary key default 1 check (id = 1),
 email text not null default '', email_visible boolean not null default true,
 telegram text not null default '', telegram_visible boolean not null default true,
 youtube text not null default '', youtube_visible boolean not null default true,
 whatsapp text not null default '', whatsapp_visible boolean not null default true,
 facebook text not null default '', facebook_visible boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.showlink_support_contacts enable row level security;
drop policy if exists "Public can read support contacts" on public.showlink_support_contacts;
create policy "Public can read support contacts" on public.showlink_support_contacts for select to anon, authenticated using (true);
drop policy if exists "Admins manage support contacts" on public.showlink_support_contacts;
create policy "Admins manage support contacts" on public.showlink_support_contacts for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
grant select on public.showlink_support_contacts to anon, authenticated;
grant insert, update, delete on public.showlink_support_contacts to authenticated;
insert into public.showlink_support_contacts (id) values (1) on conflict (id) do nothing;
