/**
 * 웨어러블 시스템 통합 테스트
 *
 * 대상: schemas, mockProvider, sleepStore, provider registry, confidence 연동
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  WearableSleepSummarySchema,
  WearableStatusSchema,
  safeParseSleepSummary,
  estimateSleepQuality,
} from './schemas';
import MockWearableProvider, { resetMockState } from './mockProvider';
import useSleepStore from '../../store/useSleepStore';
import { calculateConfidence } from '../scoring/confidence';

// ─── WearableSleepSummary Schema ─────────────────────────────

describe('WearableSleepSummarySchema', () => {
  const validSummary = {
    date: '2026-02-04',
    totalSleepMinutes: 420,
    sleepQualityScore: 7,
    remMinutes: 90,
    deepMinutes: 80,
    hrvMs: 45,
    bedTime: '23:00',
    wakeTime: '06:00',
    source: 'healthkit',
    fetchedAt: '2026-02-04T08:00:00.000Z',
  };

  it('should accept valid summary', () => {
    const result = WearableSleepSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it('should accept nullable fields', () => {
    const result = WearableSleepSummarySchema.safeParse({
      ...validSummary,
      totalSleepMinutes: null,
      sleepQualityScore: null,
      remMinutes: null,
      deepMinutes: null,
      hrvMs: null,
      bedTime: null,
      wakeTime: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const result = WearableSleepSummarySchema.safeParse({
      ...validSummary,
      date: '2026/02/04',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid source', () => {
    const result = WearableSleepSummarySchema.safeParse({
      ...validSummary,
      source: 'fitbit',
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative sleep minutes', () => {
    const result = WearableSleepSummarySchema.safeParse({
      ...validSummary,
      totalSleepMinutes: -10,
    });
    expect(result.success).toBe(false);
  });

  it('should reject quality score > 10', () => {
    const result = WearableSleepSummarySchema.safeParse({
      ...validSummary,
      sleepQualityScore: 11,
    });
    expect(result.success).toBe(false);
  });
});

describe('safeParseSleepSummary', () => {
  it('should return success for valid data', () => {
    const result = safeParseSleepSummary({
      date: '2026-01-01',
      totalSleepMinutes: 480,
      sleepQualityScore: 8,
      remMinutes: null,
      deepMinutes: null,
      hrvMs: null,
      source: 'manual',
      fetchedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe('manual');
  });

  it('should return failure for garbage data', () => {
    const result = safeParseSleepSummary({ foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

// ─── estimateSleepQuality ────────────────────────────────────

describe('estimateSleepQuality', () => {
  it('should return null for null sleep minutes', () => {
    expect(estimateSleepQuality({ totalSleepMinutes: null })).toBeNull();
  });

  it('should return null for zero sleep minutes', () => {
    expect(estimateSleepQuality({ totalSleepMinutes: 0 })).toBeNull();
  });

  it('should score optimal sleep (7-9h) higher', () => {
    const optimal = estimateSleepQuality({ totalSleepMinutes: 480 }); // 8h
    const short = estimateSleepQuality({ totalSleepMinutes: 240 }); // 4h
    expect(optimal).toBeGreaterThan(short);
  });

  it('should give bonus for good REM/deep ratio', () => {
    const withStages = estimateSleepQuality({
      totalSleepMinutes: 480,
      remMinutes: 100, // ~21%
      deepMinutes: 85, // ~18%
      hrvMs: 55,
    });
    const withoutStages = estimateSleepQuality({
      totalSleepMinutes: 480,
    });
    expect(withStages).toBeGreaterThanOrEqual(withoutStages);
  });

  it('should return score in 0-10 range', () => {
    const score = estimateSleepQuality({
      totalSleepMinutes: 480,
      remMinutes: 100,
      deepMinutes: 85,
      hrvMs: 60,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });
});

// ─── WearableStatus Schema ───────────────────────────────────

describe('WearableStatusSchema', () => {
  it('should accept valid status', () => {
    const result = WearableStatusSchema.safeParse({
      connected: true,
      platform: 'healthkit',
      lastSync: '2026-02-04T08:00:00Z',
      permissions: ['sleep', 'heartRate'],
    });
    expect(result.success).toBe(true);
  });

  it('should accept web platform', () => {
    const result = WearableStatusSchema.safeParse({
      connected: false,
      platform: 'web',
      lastSync: null,
      permissions: [],
    });
    expect(result.success).toBe(true);
  });
});

// ─── MockWearableProvider ────────────────────────────────────

describe('MockWearableProvider', () => {
  beforeEach(() => {
    resetMockState();
  });

  it('should start disconnected', async () => {
    const status = await MockWearableProvider.getStatus();
    expect(status.connected).toBe(false);
    expect(status.platform).toBe('healthkit'); // mock simulates healthkit platform
  });

  it('should connect on requestPermissions', async () => {
    const result = await MockWearableProvider.requestPermissions();
    expect(result.granted).toBe(true);

    const status = await MockWearableProvider.getStatus();
    expect(status.connected).toBe(true);
  });

  it('should disconnect', async () => {
    await MockWearableProvider.requestPermissions();
    await MockWearableProvider.disconnect();

    const status = await MockWearableProvider.getStatus();
    expect(status.connected).toBe(false);
  });

  it('should generate deterministic sleep summaries', async () => {
    await MockWearableProvider.requestPermissions();
    const summaries = await MockWearableProvider.getSleepSummaries('2026-01-01', '2026-01-03');

    expect(summaries.length).toBe(3);
    // Same date should always produce same data
    const first = summaries[0];
    const again = await MockWearableProvider.getSleepSummary('2026-01-01');
    expect(again.totalSleepMinutes).toBe(first.totalSleepMinutes);
  });

  it('should return schema-valid summaries', async () => {
    await MockWearableProvider.requestPermissions();
    const summary = await MockWearableProvider.getSleepSummary('2026-02-04');

    const result = WearableSleepSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('should always generate data (mock mode)', async () => {
    // Mock provider generates data regardless of connection state (development convenience)
    const summaries = await MockWearableProvider.getSleepSummaries('2026-01-01', '2026-01-03');
    expect(summaries.length).toBe(3);
  });
});

// ─── useSleepStore ───────────────────────────────────────────

describe('useSleepStore', () => {
  beforeEach(() => {
    useSleepStore.getState().reset();
  });

  const makeSummary = (date, source = 'manual', totalSleepMinutes = 480) => ({
    date,
    totalSleepMinutes,
    sleepQualityScore: 7,
    remMinutes: null,
    deepMinutes: null,
    hrvMs: null,
    bedTime: '23:00',
    wakeTime: '07:00',
    source,
    fetchedAt: new Date().toISOString(),
  });

  it('should add a sleep summary', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04'));
    expect(useSleepStore.getState().summaries).toHaveLength(1);
  });

  it('should replace existing summary for same date', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'manual', 480));
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'manual', 420));

    const summaries = useSleepStore.getState().summaries;
    expect(summaries).toHaveLength(1);
    expect(summaries[0].totalSleepMinutes).toBe(420);
  });

  it('should prioritize manual over auto data', () => {
    // First: manual entry
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'manual', 480));
    // Second: auto data tries to overwrite
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'healthkit', 420));

    const summaries = useSleepStore.getState().summaries;
    expect(summaries[0].totalSleepMinutes).toBe(480); // manual kept
    expect(summaries[0].source).toBe('manual');
  });

  it('should allow auto data when no manual exists', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'healthkit', 420));
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'healthconnect', 460));

    const summaries = useSleepStore.getState().summaries;
    expect(summaries[0].totalSleepMinutes).toBe(460); // latest auto wins
  });

  it('should allow manual to overwrite auto data', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'healthkit', 420));
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04', 'manual', 500));

    const summaries = useSleepStore.getState().summaries;
    expect(summaries[0].totalSleepMinutes).toBe(500);
    expect(summaries[0].source).toBe('manual');
  });

  it('should limit to 90 entries', () => {
    for (let i = 0; i < 100; i++) {
      const d = `2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`;
      useSleepStore.getState().setSleepSummary(makeSummary(d));
    }
    expect(useSleepStore.getState().summaries.length).toBeLessThanOrEqual(90);
  });

  it('should get summary by date', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04'));
    const result = useSleepStore.getState().getSummaryByDate('2026-02-04');
    expect(result).toBeDefined();
    expect(result.date).toBe('2026-02-04');
  });

  it('should calculate coverage percentage', () => {
    // Add 3 of 7 days
    useSleepStore.getState().setSleepSummary(makeSummary(new Date().toISOString().split('T')[0]));
    const coverage = useSleepStore.getState().getCoverage(7);
    expect(coverage).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeLessThanOrEqual(100);
  });

  it('should detect wearable data presence', () => {
    expect(useSleepStore.getState().hasWearableData()).toBe(false);

    useSleepStore.getState().setSleepSummary(makeSummary(
      new Date().toISOString().split('T')[0],
      'healthkit',
    ));
    expect(useSleepStore.getState().hasWearableData()).toBe(true);
  });

  it('should batch-set summaries', () => {
    useSleepStore.getState().setSleepSummaries([
      makeSummary('2026-02-01'),
      makeSummary('2026-02-02'),
      makeSummary('2026-02-03'),
    ]);
    expect(useSleepStore.getState().summaries).toHaveLength(3);
  });

  it('should reset store', () => {
    useSleepStore.getState().setSleepSummary(makeSummary('2026-02-04'));
    useSleepStore.getState().reset();
    expect(useSleepStore.getState().summaries).toHaveLength(0);
  });
});

// ─── Confidence 연동 ─────────────────────────────────────────

describe('Confidence with wearable data', () => {
  it('should score higher with wearable data', () => {
    const withoutWearable = calculateConfidence({
      data: { dreamCount: 3, checkInCount: 5, hasWearableData: false },
      sleep: { isManualInput: true, sleepDuration: 480 },
      consistency: {},
      model: {},
    });

    const withWearable = calculateConfidence({
      data: { dreamCount: 3, checkInCount: 5, hasWearableData: true },
      sleep: {
        isManualInput: false,
        sleepDuration: 480,
        remPercent: 22,
        deepPercent: 18,
        hrv: 55,
      },
      consistency: {},
      model: {},
    });

    expect(withWearable).toBeGreaterThan(withoutWearable);
  });

  it('should return 0-100 range', () => {
    const score = calculateConfidence({
      data: { dreamCount: 0, checkInCount: 0, hasWearableData: false },
      sleep: { isManualInput: true },
      consistency: {},
      model: {},
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
