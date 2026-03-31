create table if not exists oral_narratives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_date date not null,
  generated_at timestamptz not null default now(),
  headline text,
  narrative text,
  positive_signal text,
  watch_signal text,
  oral_context jsonb,
  blood_context jsonb,
  sleep_context jsonb,
  raw_response jsonb,
  unique (user_id, collection_date)
);

alter table oral_narratives enable row level security;

create policy "Users can read own oral narratives"
  on oral_narratives for select
  using (auth.uid() = user_id);

create policy "Service role can write oral narratives"
  on oral_narratives for all
  using (true)
  with check (true);
