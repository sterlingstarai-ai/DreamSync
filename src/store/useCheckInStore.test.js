/**
 * useCheckInStore 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useCheckInStore from './useCheckInStore';
import analytics from '../lib/adapters/analytics';

describe('useCheckInStore', () => {
  beforeEach(() => {
    useCheckInStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('should start with empty state', () => {
    const state = useCheckInStore.getState();
    expect(state.logs).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should add a check-in', async () => {
    const log = await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 4,
      emotions: ['happy', 'peaceful'],
      stressLevel: 2,
      events: ['exercise'],
    });

    expect(log).toBeDefined();
    expect(log.condition).toBe(4);
    expect(log.emotions).toEqual(['happy', 'peaceful']);
    expect(log.stressLevel).toBe(2);

    const state = useCheckInStore.getState();
    expect(state.logs).toHaveLength(1);
  });

  it('should track check-in completion with duration', async () => {
    const trackSpy = vi.spyOn(analytics, 'track');

    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 4,
      emotions: ['happy'],
      stressLevel: 2,
      events: ['exercise'],
      durationSec: 29,
    });

    expect(trackSpy).toHaveBeenCalledWith(
      analytics.events.CHECKIN_COMPLETE,
      expect.objectContaining({ total_duration_sec: 29 }),
    );
  });

  it('should update existing check-in for same day', async () => {
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: ['neutral'],
      stressLevel: 3,
      events: [],
    });

    // Second check-in same day should update
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 5,
      emotions: ['happy'],
      stressLevel: 1,
      events: ['exercise'],
    });

    const state = useCheckInStore.getState();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].condition).toBe(5);
  });

  it('should check if checked in today', async () => {
    expect(useCheckInStore.getState().hasCheckedInToday('user-1')).toBe(false);

    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: ['neutral'],
      stressLevel: 3,
      events: [],
    });

    expect(useCheckInStore.getState().hasCheckedInToday('user-1')).toBe(true);
  });

  it('should get today log', async () => {
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 4,
      emotions: ['happy'],
      stressLevel: 2,
      events: [],
    });

    const todayLog = useCheckInStore.getState().getTodayLog('user-1');
    expect(todayLog).toBeDefined();
    expect(todayLog.condition).toBe(4);
  });

  it('should delete a check-in', async () => {
    const log = await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: ['neutral'],
      stressLevel: 3,
      events: [],
    });

    useCheckInStore.getState().deleteCheckIn(log.id);
    expect(useCheckInStore.getState().logs).toHaveLength(0);
  });

  it('should calculate average condition', async () => {
    // Manually add logs with different dates
    useCheckInStore.setState({
      logs: [
        { id: '1', userId: 'user-1', date: new Date().toISOString().split('T')[0], condition: 4, emotions: [], stressLevel: 2, events: [] },
      ],
    });

    const avg = useCheckInStore.getState().getAverageCondition('user-1');
    expect(avg).toBe(4);
  });

  it('should return 0 for average condition with no logs', () => {
    const avg = useCheckInStore.getState().getAverageCondition('user-1');
    expect(avg).toBe(0);
  });

  it('should calculate weekly completion rate', async () => {
    // Add today's check-in
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: ['neutral'],
      stressLevel: 3,
      events: [],
    });

    const rate = useCheckInStore.getState().getWeeklyCompletionRate('user-1');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('should get top emotions', async () => {
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 4,
      emotions: ['happy', 'peaceful', 'happy'],
      stressLevel: 2,
      events: [],
    });

    const topEmotions = useCheckInStore.getState().getTopEmotions('user-1');
    expect(topEmotions.length).toBeGreaterThan(0);
  });

  it('should calculate streak', async () => {
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: [],
      stressLevel: 3,
      events: [],
    });

    const streak = useCheckInStore.getState().getStreak('user-1');
    expect(streak).toBe(1);
  });

  it('should reset state', async () => {
    await useCheckInStore.getState().addCheckIn({
      userId: 'user-1',
      condition: 3,
      emotions: [],
      stressLevel: 3,
      events: [],
    });

    useCheckInStore.getState().reset();
    expect(useCheckInStore.getState().logs).toEqual([]);
  });

  describe('data cap', () => {
    it('should cap check-ins at MAX_CHECKINS (365)', async () => {
      // Pre-fill with 365 logs (all different dates)
      const logs = Array.from({ length: 365 }, (_, i) => ({
        id: `log-${i}`,
        userId: 'user-cap',
        date: `2025-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        condition: 3,
        emotions: [],
        stressLevel: 3,
        events: [],
        note: null,
        sleep: null,
        createdAt: new Date(2025, 0, i + 1).toISOString(),
      }));
      useCheckInStore.setState({ logs });

      // Add a new check-in (different user to avoid same-day update)
      await useCheckInStore.getState().addCheckIn({
        userId: 'user-cap-new',
        condition: 5,
        emotions: ['happy'],
        stressLevel: 1,
        events: [],
      });

      expect(useCheckInStore.getState().logs.length).toBeLessThanOrEqual(365);
    });
  });
});
