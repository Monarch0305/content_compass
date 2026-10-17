-- Content Compass — initial schema (build step 2).
-- Three tables, each owned per-user and protected by Row Level Security (RLS)
-- so a logged-in user can only read/write their own rows (D-011).
-- Rollback: drop table <name> for each (nothing else depends on them yet).

-- ============================================================
-- saved_items: the core table (one row per saved video)
-- ============================================================
create table public.saved_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  url            text not null,
  platform       text not null check (platform in ('youtube', 'short', 'reel')),
  title          text not null default '',
  channel        text not null default '',
  duration       text,                -- nullable; often unknown for Reels
  thumbnail_url  text not null default '',
  summary        text not null default '',
  user_note      text,                -- optional "why saving this" (D-005)
  custom_reminder text check (custom_reminder in ('tonight', 'weekend', 'next_week')), -- optional preset (D-020)
  status         text not null default 'unwatched' check (status in ('unwatched', 'watched')),
  created_at     timestamptz not null default now(),
  watched_at     timestamptz,
  -- A user can't save the same link twice (the "already saved" rule, D-018).
  unique (user_id, url)
);

-- Speeds up the dashboard (a user's items, newest first) and the reminder job
-- (a user's unwatched items).
create index saved_items_user_status_idx
  on public.saved_items (user_id, status, created_at desc);

alter table public.saved_items enable row level security;

create policy "Users manage their own saved items"
  on public.saved_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- push_subscriptions: one row per device that opted into push
-- ============================================================
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null,
  keys        jsonb not null,         -- the browser's push keys (p256dh, auth)
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- reminder_settings: one row per user (their two daily times)
-- ============================================================
create table public.reminder_settings (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  times     text[] not null default array['09:00', '20:00'],  -- D-018
  timezone  text not null default 'Asia/Kolkata'              -- D-018
);

alter table public.reminder_settings enable row level security;

create policy "Users manage their own reminder settings"
  on public.reminder_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
