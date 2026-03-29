-- Lifestyle check-ins — periodic self-reported lifestyle snapshots for trends
create table if not exists lifestyle_checkins (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        references auth.users not null,
  exercise_frequency  text,       -- 'less' | 'same' | 'more'
  diet_quality        text,       -- 'worse' | 'same' | 'better'
  alcohol_frequency   text,       -- 'more' | 'same' | 'less' | 'none'
  stress_level        text,       -- 'higher' | 'same' | 'lower'
  sleep_priority      text,       -- 'less' | 'same' | 'more'
  smoking             text,       -- 'yes' | 'no' | null
  notes               text,
  checked_in_at       timestamptz default now(),
  created_at          timestamptz default now()
);

alter table lifestyle_checkins enable row level security;

create policy "Users can read own checkins"
  on lifestyle_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert own checkins"
  on lifestyle_checkins for insert
  with check (auth.uid() = user_id);
