begin;

alter table public.users
  add column if not exists banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create index if not exists idx_users_banned on public.users(banned);

commit;
