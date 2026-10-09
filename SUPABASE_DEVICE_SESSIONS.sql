create table if not exists public.showlink_device_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, device_id uuid not null, device_label text not null default 'Browser', user_agent text, ip_address text, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), revoked_at timestamptz, revoked_reason text, unique(user_id,device_id));
create index if not exists showlink_device_sessions_user_last_seen_idx on public.showlink_device_sessions(user_id,last_seen_at desc);
alter table public.showlink_device_sessions enable row level security;
revoke all on public.showlink_device_sessions from anon, authenticated;
grant all on public.showlink_device_sessions to service_role;
