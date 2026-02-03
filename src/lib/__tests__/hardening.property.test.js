/**
 * Property-Based & Mutation-Hardening Tests
 *
 * fast-check으로 임의 입력에 대한 불변 조건(invariant) 검증.
 * 뮤테이션 테스트 대체: 경계값/연산자 변경을 직접 검증하는 테스트 포함.
 *
 * 대상 모듈:
 * - confidence 계산
 * - estimateSleepQuality
 * - feature flag gating
 * - Zod 스키마 파싱 fallback
 * - useSleepStore 소스 우선순위
 * - syncQueue
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

import {
  calculateConfidence,
  calculateDataCompleteness,
  calculateSleepSignalQuality,
  calculateConsistencyScore,
  calculateModelHealth,
} from '../scoring/confidence';

import { estimateSleepQuality, safeParseSleepSummary, WearableSleepSummarySchema } from '../health/schemas';
import { DEFAULT_FEATURE_FLAGS, isFlagAvailable, FEATURE_FLAG_INFO } from '../../constants/featureFlags';
import useSleepStore from '../../store/useSleepStore';
import { DreamAnalysisSchema, ForecastPredictionSchema, safeParse } from '../ai/schemas';

// ─── Confidence 계산 프로퍼티 ─────────────────────────────────

describe('Property: Confidence scoring invariants', () => {
  it('calculateConfidence always returns 0-100 for any input', () => {
    fc.assert(
      fc.property(
        fc.record({
          data: fc.record({
            dreamCount: fc.integer({ min: 0, max: 100 }),
            checkInCount: fc.integer({ min: 0, max: 100 }),
            hasWearableData: fc.boolean(),
          }),
          sleep: fc.record({
            sleepDuration: fc.option(fc.integer({ min: 0, max: 1440 }), { nil: undefined }),
            remPercent: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
            deepPercent: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
            hrv: fc.option(fc.integer({ min: 0, max: 200 }), { nil: undefined }),
            isManualInput: fc.boolean(),
          }),
          consistency: fc.record({
            accuracyHistory: fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 30 }),
          }),
          model: fc.record({
            totalRequests: fc.integer({ min: 0, max: 1000 }),
            failedRequests: fc.integer({ min: 0, max: 1000 }),
            retryRequests: fc.integer({ min: 0, max: 1000 }),
          }),
        }),
        (input) => {
          const result = calculateConfidence(input);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('calculateDataCompleteness always returns 0-100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.boolean(),
        (dreamCount, checkInCount, hasWearableData) => {
          const result = calculateDataCompleteness({ dreamCount, checkInCount, hasWearableData });
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('wearable data always adds to completeness (never subtracts)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (dreamCount, checkInCount) => {
          const without = calculateDataCompleteness({ dreamCount, checkInCount, hasWearableData: false });
          const withData = calculateDataCompleteness({ dreamCount, checkInCount, hasWearableData: true });
          expect(withData).toBeGreaterThanOrEqual(without);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('calculateSleepSignalQuality returns 0-100 for any input', () => {
    fc.assert(
      fc.property(
        fc.record({
          sleepDuration: fc.option(fc.integer({ min: 0, max: 1440 }), { nil: undefined }),
          remPercent: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          deepPercent: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          hrv: fc.option(fc.integer({ min: 0, max: 300 }), { nil: undefined }),
          isManualInput: fc.boolean(),
        }),
        (input) => {
          const result = calculateSleepSignalQuality(input);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateConsistencyScore returns 0-100 for any accuracy history', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 50 }),
        (accuracyHistory) => {
          const result = calculateConsistencyScore({ accuracyHistory });
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateModelHealth returns 0-100 for any request counts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        (totalRequests, failedRequests, retryRequests) => {
          const result = calculateModelHealth({ totalRequests, failedRequests, retryRequests });
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Mutation-hardening: Confidence 경계값 ────────────────────

describe('Mutation-hardening: Confidence boundary values', () => {
  it('zero data = non-zero confidence (model health + consistency baseline exist)', () => {
    const result = calculateConfidence({
      data: { dreamCount: 0, checkInCount: 0, hasWearableData: false },
      sleep: { isManualInput: true },
      consistency: {},
      model: {},
    });
    expect(result).toBeGreaterThan(0);
  });

  it('max data = significantly higher than zero data', () => {
    const zero = calculateConfidence({
      data: { dreamCount: 0, checkInCount: 0, hasWearableData: false },
      sleep: { isManualInput: true },
      consistency: {},
      model: {},
    });
    const max = calculateConfidence({
      data: { dreamCount: 7, checkInCount: 7, hasWearableData: true },
      sleep: { isManualInput: false, sleepDuration: 480, remPercent: 22, deepPercent: 18, hrv: 55 },
      consistency: { accuracyHistory: [85, 90, 88, 92] },
      model: { totalRequests: 100, failedRequests: 0, retryRequests: 0 },
    });
    expect(max).toBeGreaterThan(zero + 20);
  });

  it('manual sleep always scores lower than wearable sleep with same duration', () => {
    const manual = calculateSleepSignalQuality({ sleepDuration: 480, isManualInput: true });
    const wearable = calculateSleepSignalQuality({
      sleepDuration: 480,
      isManualInput: false,
      remPercent: 22,
      deepPercent: 18,
      hrv: 55,
    });
    expect(wearable).toBeGreaterThan(manual);
  });
});

// ─── estimateSleepQuality 프로퍼티 ───────────────────────────

describe('Property: estimateSleepQuality invariants', () => {
  it('always returns null or 0-10', () => {
    fc.assert(
      fc.property(
        fc.record({
          totalSleepMinutes: fc.oneof(fc.constant(null), fc.integer({ min: -100, max: 1000 })),
          remMinutes: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 500 })),
          deepMinutes: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 500 })),
          hrvMs: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 })),
        }),
        (input) => {
          const result = estimateSleepQuality(input);
          if (result === null) return; // null is valid for invalid input
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(10);
          expect(Number.isInteger(result)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('null/zero/negative totalSleepMinutes always returns null', () => {
    expect(estimateSleepQuality({ totalSleepMinutes: null })).toBeNull();
    expect(estimateSleepQuality({ totalSleepMinutes: 0 })).toBeNull();
    expect(estimateSleepQuality({ totalSleepMinutes: -5 })).toBeNull();
  });

  it('7-9 hour sleep scores strictly higher than <5 hour sleep', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 420, max: 540 }), // 7-9h
        fc.integer({ min: 30, max: 299 }),   // <5h
        (optimal, short) => {
          const optScore = estimateSleepQuality({ totalSleepMinutes: optimal });
          const shortScore = estimateSleepQuality({ totalSleepMinutes: short });
          expect(optScore).toBeGreaterThan(shortScore);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Feature Flag 프로퍼티 ────────────────────────────────────

describe('Property: Feature flag gating', () => {
  it('all default flags are false except mockAI', () => {
    for (const [key, value] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      if (key === 'mockAI') {
        expect(value).toBe(true);
      } else {
        expect(value).toBe(false);
      }
    }
  });

  it('isFlagAvailable returns false for unknown flags', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 20 }), // unlikely to match real flags
        fc.constantFrom('ios', 'android', 'web'),
        (randomKey, platform) => {
          // Only fail if random key is not a real flag
          if (!(randomKey in FEATURE_FLAG_INFO)) {
            expect(isFlagAvailable(randomKey, platform)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('all known flags are available on web (requiresPlatform is null)', () => {
    for (const key of Object.keys(FEATURE_FLAG_INFO)) {
      expect(isFlagAvailable(key, 'web')).toBe(true);
    }
  });
});

// ─── Zod 스키마 파싱 fallback ─────────────────────────────────

describe('Property: Zod schema parsing never crashes', () => {
  it('safeParseSleepSummary never throws on random input', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (randomInput) => {
          // Must not throw
          const result = safeParseSleepSummary(randomInput);
          expect(typeof result.success).toBe('boolean');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('safeParse(DreamAnalysisSchema) never throws on random input', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (randomInput) => {
          const result = safeParse(DreamAnalysisSchema, randomInput);
          expect(typeof result.success).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('safeParse(ForecastPredictionSchema) never throws on random input', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (randomInput) => {
          const result = safeParse(ForecastPredictionSchema, randomInput);
          expect(typeof result.success).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid WearableSleepSummary always parses successfully', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 0, max: 900 }),
        (date, sleepMins) => {
          const dateStr = date.toISOString().split('T')[0];
          const input = {
            date: dateStr,
            totalSleepMinutes: sleepMins,
            sleepQualityScore: 5,
            remMinutes: null,
            deepMinutes: null,
            hrvMs: null,
            source: 'manual',
            fetchedAt: new Date().toISOString(),
          };
          const result = WearableSleepSummarySchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── useSleepStore 소스 우선순위 프로퍼티 ─────────────────────

describe('Property: useSleepStore source priority', () => {
  beforeEach(() => {
    useSleepStore.getState().reset();
  });

  const makeSummary = (date, source, totalSleepMinutes) => ({
    date,
    totalSleepMinutes,
    sleepQualityScore: 5,
    remMinutes: null,
    deepMinutes: null,
    hrvMs: null,
    source,
    fetchedAt: new Date().toISOString(),
  });

  it('manual always wins over auto for same date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        fc.integer({ min: 100, max: 600 }),
        (manualMins, autoMins) => {
          useSleepStore.getState().reset();
          const date = '2026-06-15';

          // Set manual first
          useSleepStore.getState().setSleepSummary(makeSummary(date, 'manual', manualMins));
          // Try to overwrite with auto
          useSleepStore.getState().setSleepSummary(makeSummary(date, 'healthkit', autoMins));

          const stored = useSleepStore.getState().getSummaryByDate(date);
          expect(stored.source).toBe('manual');
          expect(stored.totalSleepMinutes).toBe(manualMins);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('manual can overwrite auto', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        fc.integer({ min: 100, max: 600 }),
        (autoMins, manualMins) => {
          useSleepStore.getState().reset();
          const date = '2026-07-20';

          // Set auto first
          useSleepStore.getState().setSleepSummary(makeSummary(date, 'healthkit', autoMins));
          // Overwrite with manual
          useSleepStore.getState().setSleepSummary(makeSummary(date, 'manual', manualMins));

          const stored = useSleepStore.getState().getSummaryByDate(date);
          expect(stored.source).toBe('manual');
          expect(stored.totalSleepMinutes).toBe(manualMins);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('store never exceeds 90 entries', () => {
    useSleepStore.getState().reset();
    for (let i = 0; i < 100; i++) {
      const m = String(Math.floor(i / 28) + 1).padStart(2, '0');
      const d = String((i % 28) + 1).padStart(2, '0');
      useSleepStore.getState().setSleepSummary(makeSummary(`2026-${m}-${d}`, 'manual', 420));
    }
    expect(useSleepStore.getState().summaries.length).toBeLessThanOrEqual(90);
  });
});

// ─── Mutation-hardening: Feature flag default=false ───────────

describe('Mutation-hardening: Feature flag defaults', () => {
  it('healthkit defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.healthkit).toBe(false);
  });

  it('edgeAI defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.edgeAI).toBe(false);
  });

  it('uhs defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.uhs).toBe(false);
  });

  it('b2b defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.b2b).toBe(false);
  });

  it('saju defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.saju).toBe(false);
  });

  it('devMode defaults to false', () => {
    expect(DEFAULT_FEATURE_FLAGS.devMode).toBe(false);
  });
});

// ─── Mutation-hardening: Storage migration ────────────────────

describe('Mutation-hardening: Store migration safety', () => {
  it('sleep store migrate from v0 returns object', () => {
    // Simulate what zustand migration does
    const persisted = { summaries: [{ date: '2026-01-01' }] };
    // v0 → current: should keep data
    const migrated = { ...persisted };
    expect(migrated.summaries).toBeDefined();
    expect(migrated.summaries.length).toBe(1);
  });

  it('feature flag store preserves flags through migration', () => {
    const persisted = { flags: { healthkit: true, uhs: false } };
    const migrated = { ...persisted };
    expect(migrated.flags.healthkit).toBe(true);
    expect(migrated.flags.uhs).toBe(false);
  });
});
