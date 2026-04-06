-- Insight cache for AI-generated dashboard insights
create table if not exists insight_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz not null default now(),
  headline text not null,
  headline_sub text not null,
  insights_positive jsonb not null default '[]'::jsonb,
  insights_watch jsonb not null default '[]'::jsonb,
  cross_panel_signals jsonb not null default '[]'::jsonb,
  panels_available text[] not null default '{}',
  score_snapshot_id uuid references score_snapshots(id) on delete set null
);

-- One cache row per user (upsert pattern)
create unique index if not exists insight_cache_user_idx on insight_cache(user_id);

-- RLS
alter table insight_cache enable row level security;

create policy "Users can read own insight cache"
  on insight_cache for select
  using (auth.uid() = user_id);

create policy "Service role can manage insight cache"
  on insight_cache for all
  using (true)
  with check (true);
