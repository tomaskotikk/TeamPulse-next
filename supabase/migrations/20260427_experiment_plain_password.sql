-- VÝUKOVÝ EXPERIMENT: plain text heslo vedle hashe
-- Nikdy nepoužívat v produkci
alter table public.users
  add column if not exists password_plain text;

alter table public.pending_registrations
  add column if not exists password_plain text;
