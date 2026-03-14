-- ============================================================================
-- Peaq Health — Initial Schema
-- Migration: 20260313000001_initial_schema.sql
-- ============================================================================

-- ── 1. profiles ─────────────────────────────────────────────────────────────

create table public.profiles (
  id                   uuid primary key references auth.users on delete cascade,
  email                text not null,
  first_name           text not null default '',
  last_name            text not null default '',
  junction_user_id     text,
  onboarding_step      text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── 2. wearable_connections ─────────────────────────────────────────────────

create table public.wearable_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  provider          text not null,
  junction_user_id  text not null,
  status            text not null default 'pending',
  connected_at      timestamptz not null default now(),
  last_sync_at      timestamptz,
  retro_nights      integer
);

alter table public.wearable_connections enable row level security;

create policy "Users can read own wearable connections"
  on public.wearable_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own wearable connections"
  on public.wearable_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own wearable connections"
  on public.wearable_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own wearable connections"
  on public.wearable_connections for delete
  using (auth.uid() = user_id);

-- ── 3. lab_results ──────────────────────────────────────────────────────────

create table public.lab_results (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  source                   text not null,
  lab_name                 text,
  collection_date          date not null,
  uploaded_at              timestamptz not null default now(),
  hs_crp_mgl               numeric,
  vitamin_d_ngml           numeric,
  apob_mgdl                numeric,
  ldl_mgdl                 numeric,
  hdl_mgdl                 numeric,
  triglycerides_mgdl       numeric,
  lpa_mgdl                 numeric,
  glucose_mgdl             numeric,
  hba1c_pct                numeric,
  esr_mmhr                 numeric,
  homocysteine_umoll       numeric,
  ferritin_ngml            numeric,
  junction_parser_job_id   text,
  parser_status            text,
  raw_pdf_storage_path     text
);

alter table public.lab_results enable row level security;

create policy "Users can read own lab results"
  on public.lab_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own lab results"
  on public.lab_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lab results"
  on public.lab_results for update
  using (auth.uid() = user_id);

create policy "Users can delete own lab results"
  on public.lab_results for delete
  using (auth.uid() = user_id);

-- ── 4. oral_kit_orders ──────────────────────────────────────────────────────

create table public.oral_kit_orders (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  ordered_at              timestamptz not null default now(),
  status                  text not null default 'ordered',
  tracking_number         text,
  zymo_report_id          text,
  shannon_diversity       numeric,
  nitrate_reducers_pct    numeric,
  periodontopathogen_pct  numeric,
  osa_taxa_pct            numeric,
  collection_date         date
);

alter table public.oral_kit_orders enable row level security;

create policy "Users can read own oral kit orders"
  on public.oral_kit_orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own oral kit orders"
  on public.oral_kit_orders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own oral kit orders"
  on public.oral_kit_orders for update
  using (auth.uid() = user_id);

create policy "Users can delete own oral kit orders"
  on public.oral_kit_orders for delete
  using (auth.uid() = user_id);

-- ── 5. lifestyle_records ────────────────────────────────────────────────────

create table public.lifestyle_records (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  answered_at          timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  exercise_level       text not null,
  brushing_freq        text not null,
  flossing_freq        text not null,
  mouthwash_type       text not null,
  last_dental_visit    text not null,
  smoking_status       text not null,
  known_hypertension   boolean not null default false,
  known_diabetes       boolean not null default false,
  sleep_duration       text not null,
  sleep_latency        text not null,
  sleep_qual_self      text not null,
  daytime_fatigue      text not null,
  night_wakings        text not null,
  sleep_medication     text not null
);

alter table public.lifestyle_records enable row level security;

create policy "Users can read own lifestyle records"
  on public.lifestyle_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own lifestyle records"
  on public.lifestyle_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lifestyle records"
  on public.lifestyle_records for update
  using (auth.uid() = user_id);

create policy "Users can delete own lifestyle records"
  on public.lifestyle_records for delete
  using (auth.uid() = user_id);

-- ── 6. score_snapshots ──────────────────────────────────────────────────────

create table public.score_snapshots (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  calculated_at             timestamptz not null default now(),
  engine_version            text not null,
  score                     numeric not null,
  category                  text not null,
  sleep_sub                 numeric not null default 0,
  sleep_source              text not null default 'none',
  blood_sub                 numeric not null default 0,
  oral_sub                  numeric not null default 0,
  lifestyle_sub             numeric not null default 0,
  interaction_pool          numeric not null default 14,
  lab_result_id             uuid references public.lab_results(id),
  oral_kit_id               uuid references public.oral_kit_orders(id),
  wearable_connection_id    uuid references public.wearable_connections(id),
  lifestyle_record_id       uuid references public.lifestyle_records(id),
  lab_freshness             text not null default 'none'
);

alter table public.score_snapshots enable row level security;

create policy "Users can read own score snapshots"
  on public.score_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own score snapshots"
  on public.score_snapshots for insert
  with check (auth.uid() = user_id);

-- ── 7. waitlist ─────────────────────────────────────────────────────────────

create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anon users can insert into waitlist (public landing page)
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- ── Trigger: auto-create profile on auth.users insert ───────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Updated_at trigger helper ───────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger lifestyle_records_updated_at
  before update on public.lifestyle_records
  for each row execute function public.set_updated_at();
