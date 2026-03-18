begin;

alter table public.clubs
  add column if not exists approved boolean not null default true;

create index if not exists idx_clubs_approved on public.clubs(approved);

commit;
