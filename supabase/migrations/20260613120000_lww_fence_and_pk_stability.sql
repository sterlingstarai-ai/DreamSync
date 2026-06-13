-- Last-write-wins fence + primary-key stability for the multi-device sync layer.
--
-- Why: client upserts target a natural key (user_id, <date|name>) but the row
-- payload always carries a per-device-generated `id`. Without this guard:
--   1. ON CONFLICT DO UPDATE overwrites the existing row's primary key with the
--      incoming device's id, so the remote PK thrashes between devices.
--   2. A stale or replayed upsert (older client updated_at) silently clobbers a
--      newer edit made on another device — last-FLUSH-wins instead of
--      last-WRITE-wins, causing silent loss of concurrent edits.
--
-- This BEFORE UPDATE trigger makes every conflict-driven update:
--   * preserve the original primary key (first writer's id stays canonical), and
--   * reject overwrites whose updated_at is strictly older than the stored row.
--
-- Applies to all synced tables. dreams only conflicts on its own PK (same id
-- re-upsert), so the fence still protects it from stale replays.

create or replace function public.enforce_lww_and_pk()
returns trigger
language plpgsql
as $$
begin
  -- Keep the canonical primary key; never let a conflicting upsert rewrite it.
  new.id := old.id;

  -- Last-write-wins: ignore stale overwrites, keeping the newer stored row.
  -- Equal timestamps proceed (idempotent re-sync of the same version).
  if new.updated_at is not null
     and old.updated_at is not null
     and new.updated_at < old.updated_at then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists dreams_lww on public.dreams;
create trigger dreams_lww
  before update on public.dreams
  for each row execute function public.enforce_lww_and_pk();

drop trigger if exists daily_logs_lww on public.daily_logs;
create trigger daily_logs_lww
  before update on public.daily_logs
  for each row execute function public.enforce_lww_and_pk();

drop trigger if exists forecasts_lww on public.forecasts;
create trigger forecasts_lww
  before update on public.forecasts
  for each row execute function public.enforce_lww_and_pk();

drop trigger if exists personal_symbols_lww on public.personal_symbols;
create trigger personal_symbols_lww
  before update on public.personal_symbols
  for each row execute function public.enforce_lww_and_pk();

drop trigger if exists coach_plans_lww on public.coach_plans;
create trigger coach_plans_lww
  before update on public.coach_plans
  for each row execute function public.enforce_lww_and_pk();
