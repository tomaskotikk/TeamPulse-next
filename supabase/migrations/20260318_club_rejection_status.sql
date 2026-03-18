begin;

alter table public.clubs
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

create index if not exists idx_clubs_rejected_at on public.clubs(rejected_at);

commit;
