-- Event attendance: player responses (RSVP) + actual attendance recorded by coaches.
-- Additive only.
begin;

create table if not exists public.event_attendance (
  event_id bigint not null references public.club_events(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  response varchar(8) check (response in ('yes', 'no')),
  response_reason text,
  responded_by bigint references public.users(id) on delete set null,
  responded_at timestamptz,
  attended varchar(10) check (attended in ('present', 'absent', 'excused')),
  recorded_by bigint references public.users(id) on delete set null,
  recorded_at timestamptz,
  primary key (event_id, user_id)
);

create index if not exists idx_event_attendance_user
  on public.event_attendance(user_id);

commit;
