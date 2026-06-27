/**
 * SupabaseStorageAdapter.syncPendingChanges 배선 테스트
 *
 * 적대적 리뷰 #11: 기존 매핑 테스트는 getEntityUpsertOptions 반환값만 검증해,
 * upsert 호출에 onConflict 옵션이 실제로 전달되는지(=멀티디바이스 멱등성 배선)와
 * per-item 결과 계약을 보장하지 못했다. 여기서 가짜 클라이언트로 .upsert(row, options)
 * 인자를 포착해 고정한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  /** @type {Array<{ table: string, row: any, options: any }>} */
  calls: [],
  /** @type {Set<string>} */
  failTables: new Set(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => ({
      upsert: (row, options) => {
        mocks.calls.push({ table, row, options });
        return Promise.resolve(
          mocks.failTables.has(table)
            ? { error: new Error(`upsert failed for ${table}`) }
            : { error: null },
        );
      },
    }),
  }),
}));

import SupabaseStorageAdapter from './supabase';

function change(entity, recordId, payload) {
  return {
    id: `q-${recordId}`,
    entity,
    op: 'upsert',
    recordId,
    clientUpdatedAt: '2026-03-07T00:00:00.000Z',
    sourceDeviceId: 'device-a',
    payload: { id: recordId, updatedAt: '2026-03-07T00:00:00.000Z', ...payload },
  };
}

const DAILY_LOG = { userId: 'u1', date: '2026-03-07', condition: 3, stressLevel: 3, createdAt: '2026-03-07T00:00:00.000Z' };
const DREAM = { userId: 'u1', date: '2026-03-07', content: 'x', createdAt: '2026-03-07T00:00:00.000Z' };

describe('SupabaseStorageAdapter.syncPendingChanges wiring', () => {
  beforeEach(() => {
    mocks.calls.length = 0;
    mocks.failTables.clear();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('forwards the onConflict option per entity including dreams (user_id,dream_date)', async () => {
    const result = await SupabaseStorageAdapter.syncPendingChanges([
      change('daily_logs', 'log-1', DAILY_LOG),
      change('forecasts', 'fc-1', { userId: 'u1', date: '2026-03-07', prediction: {}, createdAt: '2026-03-07T00:00:00.000Z' }),
      change('personal_symbols', 'sym-1', { userId: 'u1', name: '바다', count: 1, createdAt: '2026-03-07T00:00:00.000Z' }),
      change('coach_plans', 'cp-1', { userId: 'u1', date: '2026-03-07', tasks: [], createdAt: '2026-03-07T00:00:00.000Z' }),
      change('dreams', 'dream-1', DREAM),
    ]);

    const byTable = Object.fromEntries(mocks.calls.map((c) => [c.table, c.options]));
    expect(byTable.daily_logs).toEqual({ onConflict: 'user_id,log_date' });
    expect(byTable.forecasts).toEqual({ onConflict: 'user_id,forecast_date' });
    expect(byTable.personal_symbols).toEqual({ onConflict: 'user_id,name' });
    expect(byTable.coach_plans).toEqual({ onConflict: 'user_id,plan_date' });
    // Q3 마이그레이션: (user_id, dream_date) 자연키 유니크 제약 추가 후
    // dreams도 (user_id,dream_date) 충돌 시 UPDATE로 처리해야 멀티디바이스 동일날짜 꿈이 UNIQUE 위반 없이 병합됨.
    expect(byTable.dreams).toEqual({ onConflict: 'user_id,dream_date' });

    expect(result.succeeded).toEqual(['q-log-1', 'q-fc-1', 'q-sym-1', 'q-cp-1', 'q-dream-1']);
    expect(result.failed).toEqual([]);
  });

  it('isolates a failing row: healthy rows succeed, the poison row lands in failed[]', async () => {
    mocks.failTables.add('forecasts');

    const result = await SupabaseStorageAdapter.syncPendingChanges([
      change('daily_logs', 'log-1', DAILY_LOG),
      change('forecasts', 'fc-1', { userId: 'u1', date: '2026-03-07', prediction: {}, createdAt: '2026-03-07T00:00:00.000Z' }),
      change('dreams', 'dream-1', DREAM),
    ]);

    expect(result.succeeded).toEqual(['q-log-1', 'q-dream-1']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('q-fc-1');
    expect(result.failed[0].error).toBeInstanceOf(Error);
  });

  it('drops unknown-entity items as succeeded so they cannot wedge the queue', async () => {
    const result = await SupabaseStorageAdapter.syncPendingChanges([
      { id: 'q-junk', recordId: 'junk', op: 'upsert', payload: { id: 'junk' } },
    ]);

    expect(result.succeeded).toEqual(['q-junk']);
    expect(result.failed).toEqual([]);
    expect(mocks.calls).toEqual([]); // never hit the network
  });
});
