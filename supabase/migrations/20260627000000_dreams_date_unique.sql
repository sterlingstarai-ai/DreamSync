-- Q3: (user_id, dream_date) 자연키 유니크 제약 — 다기기 중복 방지
--
-- 충돌 정책: LWW upsert (last-write-wins)
--   - 충돌 발생 시 updated_at이 더 최신인 레코드가 이김.
--   - 최초 기록자의 id가 canonical PK로 유지됨 (기존 dreams_lww BEFORE UPDATE 트리거가 보장).
--   - equal updated_at은 멱등 재전송으로 처리 (덮어쓰되 결과 동일).
--
-- 기존 트리거 상호작용:
--   supabase/migrations/20260613120000_lww_fence_and_pk_stability.sql 에서 생성된
--   dreams_lww BEFORE UPDATE 트리거가 ON CONFLICT ... DO UPDATE 경로에서도 자동으로 발동.
--   트리거가 1) old.id 보존, 2) new.updated_at < old.updated_at 시 old 반환을 처리함.
--   따라서 트리거 변경 없이 유니크 제약만 추가하면 LWW upsert가 완성됨.
--
-- API 어댑터 주의사항 (syncPendingChanges):
--   dreams upsert는 이제 (user_id, dream_date)를 충돌 대상으로 사용해야 함:
--     INSERT INTO public.dreams (...) VALUES (...)
--     ON CONFLICT (user_id, dream_date) DO UPDATE SET
--       content = EXCLUDED.content,
--       voice_url = EXCLUDED.voice_url,
--       analysis = EXCLUDED.analysis,
--       updated_at = EXCLUDED.updated_at,
--       deleted_at = EXCLUDED.deleted_at,
--       source_device_id = EXCLUDED.source_device_id;
--   (id는 SET 목록에 포함하지 않음 — LWW 트리거가 old.id를 보존)
--
-- ⚠️ 실DB 검증 필요 (VITE_BACKEND=supabase 미활성 — 실DB 게이트 SKIP):
--   이 마이그레이션은 로컬 코드에만 적용됨. Supabase 실 DB 적용 시
--   `supabase db push` 또는 직접 실행 필요.

begin;

-- 1. 기존 중복 행 제거: (user_id, dream_date) 당 updated_at 최신 1개만 유지.
--    동점이면 id 오름차순 기준으로 첫 번째 유지(결정론적).
with ranked as (
  select id,
         row_number() over (
           partition by user_id, dream_date
           order by updated_at desc nulls last, id
         ) as rn
  from public.dreams
)
delete from public.dreams
where id in (select id from ranked where rn > 1);

-- 2. 유니크 제약 추가 (중복 없이 멱등 실행).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.dreams'::regclass
      and conname = 'dreams_user_date_unique'
  ) then
    alter table public.dreams
      add constraint dreams_user_date_unique unique (user_id, dream_date);
  end if;
end;
$$;

-- 3. 삭제되지 않은 행에 대한 (user_id, dream_date) 조회 최적화 인덱스.
--    유니크 제약이 이미 전체 인덱스를 생성하므로 이 partial 인덱스는
--    "오늘 live 꿈" 조회 경로를 추가 최적화함.
create index if not exists dreams_user_date_live_idx
  on public.dreams (user_id, dream_date)
  where deleted_at is null;

commit;
