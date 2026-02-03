/**
 * UHS Scoring Tests
 */
import { describe, it, expect } from 'vitest';
import {
  calculateUHS,
  calculateSleepScore,
  calculateStressScore,
  calculateDreamScore,
  calculateMoodDriftScore,
  calculatePredictionErrorScore,
  getUHSLevel,
  UHS_DISCLAIMER,
} from './uhs';

describe('calculateSleepScore', () => {
  it('should return 50 for no data', () => {
    const result = calculateSleepScore({});
    expect(result).toBe(50);
  });

  it('should give high score for optimal sleep', () => {
    const result = calculateSleepScore({
      duration: 450, // 7.5 hours
      quality: 5,
      remPercent: 22,
      deepPercent: 18,
    });
    expect(result).toBeGreaterThan(90);
  });

  it('should penalize short sleep', () => {
    const result = calculateSleepScore({
      duration: 240, // 4 hours
      quality: 3,
    });
    expect(result).toBeLessThan(80);
  });
});

describe('calculateStressScore', () => {
  it('should return 50 for moderate stress', () => {
    const result = calculateStressScore({ stressLevel: 3 });
    expect(result).toBe(50);
  });

  it('should return 100 for no stress', () => {
    const result = calculateStressScore({ stressLevel: 1 });
    expect(result).toBe(100);
  });

  it('should return 0 for max stress', () => {
    const result = calculateStressScore({ stressLevel: 5 });
    expect(result).toBe(0);
  });
});

describe('calculateDreamScore', () => {
  it('should return 50 for no data', () => {
    const result = calculateDreamScore({});
    expect(result).toBe(50);
  });

  it('should score optimal intensity highly', () => {
    const result = calculateDreamScore({
      avgIntensity: 5,
      symbolVariety: 5,
      dreamCount: 3,
    });
    expect(result).toBeGreaterThan(90);
  });
});

describe('calculateMoodDriftScore', () => {
  it('should return 50 for insufficient data', () => {
    const result = calculateMoodDriftScore({ conditions: [3] });
    expect(result).toBe(50);
  });

  it('should return high score for stable mood', () => {
    const result = calculateMoodDriftScore({
      conditions: [4, 4, 4, 4, 4],
    });
    expect(result).toBeGreaterThan(80);
  });

  it('should penalize volatile mood', () => {
    const result = calculateMoodDriftScore({
      conditions: [1, 5, 2, 5, 1],
    });
    expect(result).toBeLessThan(60);
  });
});

describe('calculatePredictionErrorScore', () => {
  it('should return 50 for no data', () => {
    const result = calculatePredictionErrorScore({});
    expect(result).toBe(50);
  });

  it('should pass through accuracy directly', () => {
    const result = calculatePredictionErrorScore({ avgAccuracy: 80 });
    expect(result).toBe(80);
  });

  it('should clamp to 0-100', () => {
    expect(calculatePredictionErrorScore({ avgAccuracy: 150 })).toBe(100);
    expect(calculatePredictionErrorScore({ avgAccuracy: -20 })).toBe(0);
  });
});

describe('calculateUHS', () => {
  it('should return weighted average', () => {
    const result = calculateUHS({
      sleep: { duration: 450, quality: 4 },
      stress: { stressLevel: 2 },
      dream: { avgIntensity: 5, dreamCount: 3 },
      mood: { conditions: [4, 4, 3, 4, 4] },
      prediction: { avgAccuracy: 75 },
    });

    expect(result.score).toBeGreaterThan(60);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toHaveProperty('sleep');
    expect(result.breakdown).toHaveProperty('stress');
    expect(result.breakdown).toHaveProperty('dream');
    expect(result.breakdown).toHaveProperty('mood');
    expect(result.breakdown).toHaveProperty('prediction');
    expect(result.confidence).toBeDefined();
  });

  it('should handle empty inputs', () => {
    const result = calculateUHS({});
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('getUHSLevel', () => {
  it('should return correct levels without medical terms', () => {
    const high = getUHSLevel(85);
    expect(high.level).toBe('좋음');
    expect(high.description).not.toMatch(/진단|치료|질환|의료/);

    const medium = getUHSLevel(65);
    expect(medium.level).toBe('보통');
    expect(medium.description).not.toMatch(/진단|치료|질환|의료/);

    const low = getUHSLevel(45);
    expect(low.level).toBe('주의');
    expect(low.description).not.toMatch(/진단|치료|질환|의료/);

    const veryLow = getUHSLevel(25);
    expect(veryLow.level).toBe('관심 필요');
    expect(veryLow.description).not.toMatch(/진단|치료|질환|의료/);
  });
});

describe('UHS_DISCLAIMER', () => {
  it('should contain proper disclaimer text', () => {
    expect(UHS_DISCLAIMER).toContain('참고 지표');
    expect(UHS_DISCLAIMER).toContain('의료적');
    expect(UHS_DISCLAIMER).not.toMatch(/진단을 제공|치료를 권장/);
  });
});
