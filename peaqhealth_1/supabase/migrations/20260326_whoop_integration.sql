-- ── WHOOP OAuth connections (tokens + metadata) ──────────────────────────────
create table if not exists whoop_connections (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users not null unique,
  whoop_user_id     text        not null,
  access_token      text        not null,
  refresh_token     text        not null,
  token_expires_at  timestamptz not null,
  scopes            text[],
  connected_at      timestamptz default now(),
  last_synced_at    timestamptz,
  created_at        timestamptz default now()
);

alter table whoop_connections enable row level security;

create policy "Users can read own WHOOP connection"
  on whoop_connections for select
  using (auth.uid() = user_id);

create policy "Users can update own WHOOP connection"
  on whoop_connections for update
  using (auth.uid() = user_id);

-- ── WHOOP per-night sleep records ─────────────────────────────────────────────
create table if not exists whoop_sleep_data (
  id                    uuid    primary key default gen_random_uuid(),
  user_id               uuid    references auth.users not null,
  date                  date    not null,
  total_sleep_minutes   numeric,
  deep_sleep_minutes    numeric,
  rem_sleep_minutes     numeric,
  sleep_efficiency      numeric,
  respiratory_rate      numeric,
  hrv_rmssd             numeric,
  resting_heart_rate    numeric,
  spo2                  numeric,
  recovery_score        numeric,
  raw_sleep             jsonb,
  raw_recovery          jsonb,
  created_at            timestamptz default now(),
  unique(user_id, date)
);

alter table whoop_sleep_data enable row level security;

create policy "Users can read own WHOOP sleep data"
  on whoop_sleep_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own WHOOP sleep data"
  on whoop_sleep_data for insert
  with check (auth.uid() = user_id);
