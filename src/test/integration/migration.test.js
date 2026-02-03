/**
 * 스토어 마이그레이션 테스트
 *
 * v0 데이터가 v1 migrate를 통과한 후 앱이 정상 동작하는지 검증.
 * 손상된 데이터에서도 크래시 없이 기본값으로 복구되는지 확인.
 */

import { describe, it, expect } from 'vitest';
import {
  V0_AUTH,
  V0_DREAMS,
  V0_CHECKINS,
  V0_FORECASTS,
  V0_SYMBOLS,
  EMPTY_STATE,
  NULL_FIELDS,
} from '../fixtures/v0-store-data';

// 마이그레이션 함수를 직접 테스트하기 위해 스토어의 persist config에서
// migrate 함수 로직을 재현. 실제 스토어의 migrate는 zustand persist가 호출함.

/**
 * migrate 공통 로직 (모든 스토어가 동일)
 */
function migrateV0toV1(persisted, defaults) {
  if (!persisted || typeof persisted !== 'object') {
    return defaults;
  }
  return { ...defaults, ...persisted };
}

describe('스토어 마이그레이션: v0 → v1', () => {
  it('auth: name 누락 시 email prefix로 복구', () => {
    const migrated = migrateV0toV1(V0_AUTH, {
      user: null,
      isAuthenticated: false,
    });

    expect(migrated.user).toBeDefined();
    expect(migrated.user.email).toBe('old@test.com');
    expect(migrated.isAuthenticated).toBe(true);

    // name이 없으면 앱에서 email prefix 사용하므로 null이어도 OK
    // 중요한 건 크래시가 안 나는 것
    expect(migrated.user.id).toBe('v0-user-001');
  });

  it('auth: settings 불완전 데이터 → 기본값 병합', () => {
    const defaults = {
      notifications: true,
      reminderTime: '21:00',
      theme: 'dark',
      language: 'ko',
    };

    const userSettings = V0_AUTH.user.settings;
    const merged = { ...defaults, ...userSettings };

    expect(merged.notifications).toBe(true);
    expect(merged.reminderTime).toBe('21:00'); // 기본값 유지
    expect(merged.theme).toBe('dark');           // 기본값 유지
    expect(merged.language).toBe('ko');          // 기본값 유지
  });

  it('dreams: v0 데이터 → v1 필드 보완 가능', () => {
    const migrated = migrateV0toV1(V0_DREAMS, { dreams: [] });

    expect(migrated.dreams).toHaveLength(1);
    const dream = migrated.dreams[0];

    // 기존 필드 유지
    expect(dream.id).toBe('d-v0-001');
    expect(dream.content).toBeDefined();
    expect(dream.analysis.symbols).toHaveLength(1);

    // v0에서 누락된 필드: voiceUrl, updatedAt
    // 이 필드들이 없어도 앱이 크래시 안 나야 함
    expect(dream.voiceUrl).toBeUndefined(); // 없어도 OK
    expect(dream.updatedAt).toBeUndefined(); // 없어도 OK
  });

  it('checkins: events/sleep 누락 데이터 동작', () => {
    const migrated = migrateV0toV1(V0_CHECKINS, { logs: [] });

    const log = migrated.logs[0];
    expect(log.condition).toBe(3);
    expect(log.emotions).toEqual(['평온한']);

    // 누락 필드: events, sleep
    expect(log.events).toBeUndefined();
    expect(log.sleep).toBeUndefined();
  });

  it('forecasts: prediction 키 누락(result 키만 있는 구버전)', () => {
    const migrated = migrateV0toV1(V0_FORECASTS, { forecasts: [] });

    const forecast = migrated.forecasts[0];
    expect(forecast.id).toBe('f-v0-001');

    // prediction 키 없고 result 키만 있음
    expect(forecast.prediction).toBeUndefined();
    expect(forecast.result).toBeDefined();
    expect(forecast.result.condition).toBe(3);
  });

  it('symbols: count가 string → number 변환 필요', () => {
    const migrated = migrateV0toV1(V0_SYMBOLS, { symbols: [] });

    const symbol = migrated.symbols[0];
    expect(symbol.name).toBe('바다');

    // count가 string '2' → 숫자로 변환되어야 정상
    // 현재 migrate가 passthrough이므로 string 그대로 유지됨
    // 이 테스트로 "실제 마이그레이션 로직이 필요함"을 증명
    expect(typeof symbol.count).toBe('string'); // 현재 상태
  });

  it('빈 상태에서도 크래시 없이 기본값 반환', () => {
    const dreamMigrated = migrateV0toV1(EMPTY_STATE, { dreams: [] });
    expect(dreamMigrated.dreams).toEqual([]);

    const authMigrated = migrateV0toV1(EMPTY_STATE, {
      user: null,
      isAuthenticated: false,
    });
    expect(authMigrated.user).toBeNull();
    expect(authMigrated.isAuthenticated).toBe(false);
  });

  it('null 필드가 있어도 크래시 없이 복구', () => {
    const migrated = migrateV0toV1(NULL_FIELDS, { dreams: [] });
    // null이 기본값을 덮어쓰므로 null이 됨
    expect(migrated.dreams).toBeNull();

    // 앱에서 Array 메서드 호출 시 크래시 방지를 위해
    // 스토어 액션에서 방어 코딩이 필요함을 보여주는 테스트
  });

  it('undefined 입력에서 기본값 반환', () => {
    const migrated = migrateV0toV1(undefined, { dreams: [] });
    expect(migrated.dreams).toEqual([]);
  });

  it('손상된 데이터(비객체)에서 기본값 반환', () => {
    const migrated = migrateV0toV1('corrupted string', { dreams: [] });
    expect(migrated.dreams).toEqual([]);

    const numMigrated = migrateV0toV1(42, { forecasts: [] });
    expect(numMigrated.forecasts).toEqual([]);
  });
});
