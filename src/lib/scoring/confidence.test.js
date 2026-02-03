/**
 * Confidence Scoring Tests
 */
import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  calculateDataCompleteness,
  calculateSleepSignalQuality,
  calculateConsistencyScore,
  calculateModelHealth,
  getConfidenceLevel,
} from './confidence';

describe('calculateDataCompleteness', () => {
  it('should return 0 for no data', () => {
    const result = calculateDataCompleteness({
      dreamCount: 0,
      checkInCount: 0,
      hasWearableData: false,
    });
    expect(result).toBe(0);
  });

  it('should return 100 for complete data', () => {
    const result = calculateDataCompleteness({
      dreamCount: 5,
      checkInCount: 7,
      hasWearableData: true,
    });
    expect(result).toBe(100);
  });

  it('should calculate partial scores correctly', () => {
    const result = calculateDataCompleteness({
      dreamCount: 2,
      checkInCount: 3,
      hasWearableData: false,
    });
    // dreamScore = (2/3)*30 = 20
    // checkInScore = (3/5)*50 = 30
    // wearableScore = 0
    expect(result).toBe(50);
  });
});

describe('calculateSleepSignalQuality', () => {
  it('should return 20 for manual input with no data', () => {
    const result = calculateSleepSignalQuality({
      isManualInput: true,
    });
    expect(result).toBe(20);
  });

  it('should return 60 for optimal manual sleep duration', () => {
    const result = calculateSleepSignalQuality({
      isManualInput: true,
      sleepDuration: 480, // 8 hours
    });
    expect(result).toBe(60);
  });

  it('should calculate wearable data correctly', () => {
    const result = calculateSleepSignalQuality({
      isManualInput: false,
      sleepDuration: 480, // 8 hours = 40pts
      remPercent: 22, // optimal = 20pts
      deepPercent: 18, // optimal = 20pts
      hrv: 55, // good = 20pts
    });
    expect(result).toBe(100);
  });
});

describe('calculateConsistencyScore', () => {
  it('should return 50 for empty history', () => {
    const result = calculateConsistencyScore({
      accuracyHistory: [],
    });
    expect(result).toBe(50);
  });

  it('should return high score for consistent accuracy', () => {
    const result = calculateConsistencyScore({
      accuracyHistory: [80, 80, 80, 80, 80],
    });
    // avg = 80, stdDev = 0, bonus = 10
    expect(result).toBe(90);
  });

  it('should penalize high variance', () => {
    const result = calculateConsistencyScore({
      accuracyHistory: [40, 90, 50, 85, 45],
    });
    // avg ≈ 62, high variance = low bonus
    expect(result).toBeLessThan(75);
  });
});

describe('calculateModelHealth', () => {
  it('should return 80 for no requests', () => {
    const result = calculateModelHealth({
      totalRequests: 0,
    });
    expect(result).toBe(80);
  });

  it('should return 100 for no failures', () => {
    const result = calculateModelHealth({
      totalRequests: 100,
      failedRequests: 0,
      retryRequests: 0,
    });
    expect(result).toBe(100);
  });

  it('should penalize failures', () => {
    const result = calculateModelHealth({
      totalRequests: 100,
      failedRequests: 10,
      retryRequests: 5,
    });
    expect(result).toBeLessThan(75);
  });
});

describe('calculateConfidence', () => {
  it('should calculate weighted average correctly', () => {
    const result = calculateConfidence({
      data: { dreamCount: 3, checkInCount: 5, hasWearableData: false },
      sleep: { isManualInput: true, sleepDuration: 480 },
      consistency: { accuracyHistory: [70, 75, 80] },
      model: { totalRequests: 10, failedRequests: 0 },
    });

    // Should be a reasonable confidence score
    expect(result).toBeGreaterThan(40);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should handle empty inputs', () => {
    const result = calculateConfidence({});
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('getConfidenceLevel', () => {
  it('should return correct levels', () => {
    expect(getConfidenceLevel(85).level).toBe('높음');
    expect(getConfidenceLevel(65).level).toBe('보통');
    expect(getConfidenceLevel(45).level).toBe('낮음');
    expect(getConfidenceLevel(25).level).toBe('매우 낮음');
  });
});
