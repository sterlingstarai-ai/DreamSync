/**
 * useForecastStore 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useForecastStore from './useForecastStore';

// Mock createForecast
vi.mock('../lib/ai/generateForecast', () => ({
  createForecast: vi.fn().mockResolvedValue({
    success: true,
    data: {
      condition: 4,
      confidence: 70,
      summary: '좋은 하루가 될 것 같습니다.',
      risks: [],
      suggestions: ['명상하기', '산책하기'],
    },
  }),
  getConditionLabel: vi.fn((c) => ['최악', '별로', '보통', '좋음', '최고'][c - 1]),
  getConditionColor: vi.fn(() => '#3b82f6'),
}));

describe('useForecastStore', () => {
  beforeEach(() => {
    useForecastStore.getState().reset();
  });

  it('should start with empty state', () => {
    const state = useForecastStore.getState();
    expect(state.forecasts).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should generate a forecast', async () => {
    const forecast = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    expect(forecast).toBeDefined();
    expect(forecast.prediction.condition).toBe(4);
    expect(forecast.prediction.confidence).toBe(70);
    expect(forecast.userId).toBe('user-1');

    const state = useForecastStore.getState();
    expect(state.forecasts).toHaveLength(1);
    expect(state.isGenerating).toBe(false);
  });

  it('should return existing forecast for same date', async () => {
    const first = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    const second = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    expect(second.id).toBe(first.id);
    expect(useForecastStore.getState().forecasts).toHaveLength(1);
  });

  it('should record actual and calculate accuracy', async () => {
    const forecast = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    useForecastStore.getState().recordActual(forecast.id, { condition: 4 });

    const updated = useForecastStore.getState().getForecastById(forecast.id);
    expect(updated.actual).toEqual({ condition: 4 });
    expect(updated.accuracy).toBe(100); // Same condition = 100%
  });

  it('should calculate accuracy with difference', async () => {
    const forecast = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    // Predicted 4, actual 2 = diff of 2 = 100 - 50 = 50%
    useForecastStore.getState().recordActual(forecast.id, { condition: 2 });

    const updated = useForecastStore.getState().getForecastById(forecast.id);
    expect(updated.accuracy).toBe(50);
  });

  it('should get today forecast', async () => {
    await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    const today = useForecastStore.getState().getTodayForecast('user-1');
    expect(today).toBeDefined();
    expect(today.prediction.condition).toBe(4);
  });

  it('should get average accuracy', async () => {
    // Add forecasts with recorded accuracy manually
    useForecastStore.setState({
      forecasts: [
        { id: '1', userId: 'user-1', date: '2026-01-01', prediction: { condition: 4 }, actual: { condition: 4 }, accuracy: 100, createdAt: '' },
        { id: '2', userId: 'user-1', date: '2026-01-02', prediction: { condition: 3 }, actual: { condition: 4 }, accuracy: 75, createdAt: '' },
        { id: '3', userId: 'user-1', date: '2026-01-03', prediction: { condition: 3 }, actual: null, accuracy: null, createdAt: '' },
      ],
    });

    const avg = useForecastStore.getState().getAverageAccuracy('user-1');
    expect(avg).toBe(88); // (100 + 75) / 2 = 87.5 → 88
  });

  it('should delete a forecast', async () => {
    const forecast = await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    useForecastStore.getState().deleteForecast(forecast.id);
    expect(useForecastStore.getState().forecasts).toHaveLength(0);
  });

  it('should not crash when recording actual for missing forecast', () => {
    useForecastStore.getState().recordActual('nonexistent', { condition: 3 });
    // Should not throw
    expect(useForecastStore.getState().forecasts).toHaveLength(0);
  });

  it('should reset state', async () => {
    await useForecastStore.getState().generateForecast({
      userId: 'user-1',
      recentDreams: [],
      recentLogs: [],
    });

    useForecastStore.getState().reset();
    expect(useForecastStore.getState().forecasts).toEqual([]);
  });

  describe('data cap', () => {
    it('should cap forecasts at MAX_FORECASTS (365)', async () => {
      // Pre-fill with 365 forecasts (all different dates to avoid dedup)
      const forecasts = Array.from({ length: 365 }, (_, i) => ({
        id: `fc-${i}`,
        userId: 'user-1',
        date: `2025-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        prediction: { condition: 3 },
        actual: null,
        accuracy: null,
        createdAt: new Date(2025, 0, i + 1).toISOString(),
      }));
      useForecastStore.setState({ forecasts });

      // Generate a new one (for a date that doesn't exist yet)
      await useForecastStore.getState().generateForecast({
        userId: 'user-1',
        recentDreams: [],
        recentLogs: [],
      });

      expect(useForecastStore.getState().forecasts.length).toBeLessThanOrEqual(365);
    });
  });
});
