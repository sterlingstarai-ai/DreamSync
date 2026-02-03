/**
 * Mock AI Tests
 */
import { describe, it, expect } from 'vitest';
import { MockAIAdapter } from './mock';
import { DreamAnalysisSchema, ForecastSchema } from './schemas';

describe('MockAIAdapter.analyzeDream', () => {
  it('should return valid analysis structure', async () => {
    const result = await MockAIAdapter.analyzeDream('어두운 숲을 걷고 있었다. 갑자기 폭풍이 몰아쳤다.');

    expect(result).toHaveProperty('symbols');
    expect(result).toHaveProperty('emotions');
    expect(result).toHaveProperty('themes');
    expect(result).toHaveProperty('intensity');
    expect(result).toHaveProperty('interpretation');

    expect(Array.isArray(result.symbols)).toBe(true);
    expect(Array.isArray(result.emotions)).toBe(true);
    expect(Array.isArray(result.themes)).toBe(true);
    expect(typeof result.intensity).toBe('number');
    expect(result.intensity).toBeGreaterThanOrEqual(1);
    expect(result.intensity).toBeLessThanOrEqual(10);
  });

  it('should parse Zod schema correctly', async () => {
    const result = await MockAIAdapter.analyzeDream('물속에서 수영하고 있었다.');

    // This should not throw
    const parsed = DreamAnalysisSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('should extract symbols from content', async () => {
    const result = await MockAIAdapter.analyzeDream('바다에서 물고기와 함께 수영했다.');

    // Should have at least one symbol
    expect(result.symbols.length).toBeGreaterThan(0);
  });
});

describe('MockAIAdapter.generateForecast', () => {
  it('should return valid forecast structure', async () => {
    const result = await MockAIAdapter.generateForecast({
      recentDreams: [],
      recentCheckIns: [{ condition: 4, stressLevel: 2 }],
      avgCondition: 3.5,
      avgStress: 2.5,
    });

    expect(result).toHaveProperty('condition');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('risks');
    expect(result).toHaveProperty('suggestions');

    expect(result.condition).toBeGreaterThanOrEqual(1);
    expect(result.condition).toBeLessThanOrEqual(5);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should parse Zod schema correctly', async () => {
    const result = await MockAIAdapter.generateForecast({
      avgCondition: 3,
      avgStress: 3,
    });

    const parsed = ForecastSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('MockAIAdapter.generatePatternInsights', () => {
  it('should return insights structure', async () => {
    const result = await MockAIAdapter.generatePatternInsights({
      dreams: [{ analysis: { symbols: [{ name: '물' }] } }],
      checkIns: [{ condition: 4 }],
    });

    expect(result).toHaveProperty('patterns');
    expect(result).toHaveProperty('correlations');
    expect(result).toHaveProperty('weekSummary');
  });
});
