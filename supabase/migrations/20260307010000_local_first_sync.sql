create extension if not exists pgcrypto;

create table if not exists public.dreams (
  id text primary key,
  user_id text not null,
  dream_date date not null,
  content text not null default '',
  voice_url text,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  source_device_id text not null
);

create table if not exists public.daily_logs (
  id text primary key,
  user_id text not null,
  log_date date not null,
  condition smallint not null,
  emotions jsonb not null default '[]'::jsonb,
  stress_level smallint not null,
  events jsonb not null default '[]'::jsonb,
  note text,
  sleep jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  source_device_id text not null,
  unique (user_id, log_date)
);

create table if not exists public.forecasts (
  id text primary key,
  user_id text not null,
  forecast_date date not null,
  prediction jsonb not null default '{}'::jsonb,
  actual jsonb,
  accuracy integer,
  experiment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  source_device_id text not null,
  unique (user_id, forecast_date)
);

create table if not exists public.personal_symbols (
  id text primary key,
  user_id text not null,
  name text not null,
  meaning text,
  count integer not null default 0,
  dream_ids jsonb not null default '[]'::jsonb,
  first_seen date,
  last_seen date,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  source_device_id text not null,
  unique (user_id, name)
);

create table if not exists public.coach_plans (
  id text primary key,
  user_id text not null,
  plan_date date not null,
  tasks jsonb not null default '[]'::jsonb,
  completion_rate integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  source_device_id text not null,
  unique (user_id, plan_date)
);

create index if not exists dreams_user_updated_idx on public.dreams (user_id, updated_at desc);
create index if not exists dreams_user_date_idx on public.dreams (user_id, dream_date desc);
create index if not exists daily_logs_user_updated_idx on public.daily_logs (user_id, updated_at desc);
create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);
create index if not exists forecasts_user_updated_idx on public.forecasts (user_id, updated_at desc);
create index if not exists forecasts_user_date_idx on public.forecasts (user_id, forecast_date desc);
create index if not exists personal_symbols_user_count_idx on public.personal_symbols (user_id, count desc);
create index if not exists coach_plans_user_date_idx on public.coach_plans (user_id, plan_date desc);

alter table public.dreams enable row level security;
alter table public.daily_logs enable row level security;
alter table public.forecasts enable row level security;
alter table public.personal_symbols enable row level security;
alter table public.coach_plans enable row level security;

drop policy if exists "dreams_owner_select" on public.dreams;
drop policy if exists "dreams_owner_insert" on public.dreams;
drop policy if exists "dreams_owner_update" on public.dreams;
drop policy if exists "daily_logs_owner_select" on public.daily_logs;
drop policy if exists "daily_logs_owner_insert" on public.daily_logs;
drop policy if exists "daily_logs_owner_update" on public.daily_logs;
drop policy if exists "forecasts_owner_select" on public.forecasts;
drop policy if exists "forecasts_owner_insert" on public.forecasts;
drop policy if exists "forecasts_owner_update" on public.forecasts;
drop policy if exists "personal_symbols_owner_select" on public.personal_symbols;
drop policy if exists "personal_symbols_owner_insert" on public.personal_symbols;
drop policy if exists "personal_symbols_owner_update" on public.personal_symbols;
drop policy if exists "coach_plans_owner_select" on public.coach_plans;
drop policy if exists "coach_plans_owner_insert" on public.coach_plans;
drop policy if exists "coach_plans_owner_update" on public.coach_plans;

create policy "dreams_owner_select"
  on public.dreams for select
  using (auth.uid()::text = user_id);
create policy "dreams_owner_insert"
  on public.dreams for insert
  with check (auth.uid()::text = user_id);
create policy "dreams_owner_update"
  on public.dreams for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "daily_logs_owner_select"
  on public.daily_logs for select
  using (auth.uid()::text = user_id);
create policy "daily_logs_owner_insert"
  on public.daily_logs for insert
  with check (auth.uid()::text = user_id);
create policy "daily_logs_owner_update"
  on public.daily_logs for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "forecasts_owner_select"
  on public.forecasts for select
  using (auth.uid()::text = user_id);
create policy "forecasts_owner_insert"
  on public.forecasts for insert
  with check (auth.uid()::text = user_id);
create policy "forecasts_owner_update"
  on public.forecasts for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "personal_symbols_owner_select"
  on public.personal_symbols for select
  using (auth.uid()::text = user_id);
create policy "personal_symbols_owner_insert"
  on public.personal_symbols for insert
  with check (auth.uid()::text = user_id);
create policy "personal_symbols_owner_update"
  on public.personal_symbols for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "coach_plans_owner_select"
  on public.coach_plans for select
  using (auth.uid()::text = user_id);
create policy "coach_plans_owner_insert"
  on public.coach_plans for insert
  with check (auth.uid()::text = user_id);
create policy "coach_plans_owner_update"
  on public.coach_plans for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
