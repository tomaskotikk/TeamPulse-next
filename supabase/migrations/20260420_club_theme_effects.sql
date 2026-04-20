alter table public.clubs
  add column if not exists ui_gradient_enabled boolean not null default true,
  add column if not exists ui_gradient_strength integer not null default 58,
  add column if not exists ui_gradient_soft_strength integer not null default 42,
  add column if not exists ui_glow_strength integer not null default 35,
  add column if not exists ui_backdrop_blur_strength integer not null default 8,
  add column if not exists ui_motion_speed integer not null default 100;
