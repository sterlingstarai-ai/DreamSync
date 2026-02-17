import { describe, expect, it } from 'vitest';
import { detectPatternAlerts, summarizePatternAlerts } from './patternAlertService';

describe('patternAlertService', () => {
  it('detects compound risk when condition/stress/sleep are all deteriorating', () => {
    const alerts = detectPatternAlerts({
      recentLogs: [
        { date: '2026-02-17', condition: 2, stressLevel: 5, sleep: { duration: 300 } },
        { date: '2026-02-16', condition: 2, stressLevel: 4, sleep: { duration: 320 } },
        { date: '2026-02-15', condition: 1, stressLevel: 5, sleep: { duration: 290 } },
      ],
      recentDreams: [],
    });

    expect(alerts.some(alert => alert.id === 'compound-risk')).toBe(true);
    expect(alerts.some(alert => alert.id === 'condition-drop')).toBe(true);
    expect(alerts.some(alert => alert.id === 'stress-spike')).toBe(true);
    expect(alerts.some(alert => alert.id === 'sleep-deficit')).toBe(true);
  });

  it('detects nightmare pattern from high intensity or negative dream signals', () => {
    const alerts = detectPatternAlerts({
      recentLogs: [],
      recentDreams: [
        {
          createdAt: '2026-02-17T07:00:00.000Z',
          content: '악몽을 꾸고 계속 도망쳤다',
          analysis: { intensity: 9, emotions: [{ name: '불안한' }], themes: ['도망'] },
        },
        {
          createdAt: '2026-02-16T07:00:00.000Z',
          content: '공포 속에서 깼다',
          analysis: { intensity: 8, emotions: [{ name: '공포' }], themes: ['위협'] },
        },
      ],
    });

    expect(alerts.some(alert => alert.id === 'nightmare-pattern')).toBe(true);
  });

  it('returns stable summary when no alerts exist', () => {
    const summary = summarizePatternAlerts([]);
    expect(summary.hasAlert).toBe(false);
    expect(summary.message).toContain('안정적인');
  });
});
