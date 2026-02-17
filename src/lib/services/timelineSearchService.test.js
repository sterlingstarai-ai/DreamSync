import { describe, expect, it } from 'vitest';
import { searchTimeline } from './timelineSearchService';

const dreams = [
  {
    id: 'd1',
    date: '2026-02-16',
    createdAt: '2026-02-16T07:30:00.000Z',
    content: '바다에서 수영하고 돌고래를 만났다',
    analysis: {
      symbols: [{ name: '바다', meaning: '감정' }, { name: '돌고래', meaning: '자유' }],
      emotions: [{ name: '평온한' }],
      themes: ['자유'],
    },
  },
  {
    id: 'd2',
    date: '2026-02-14',
    createdAt: '2026-02-14T06:30:00.000Z',
    content: '산을 오르다 넘어졌다',
    analysis: {
      symbols: [{ name: '산', meaning: '도전' }],
      emotions: [{ name: '불안한' }],
      themes: ['도전'],
    },
  },
];

const logs = [
  {
    id: 'c1',
    date: '2026-02-16',
    createdAt: '2026-02-16T21:00:00.000Z',
    condition: 4,
    stressLevel: 2,
    emotions: ['peaceful'],
    events: ['health_exercise'],
  },
  {
    id: 'c2',
    date: '2026-02-14',
    createdAt: '2026-02-14T21:00:00.000Z',
    condition: 2,
    stressLevel: 4,
    emotions: ['anxious'],
    events: ['work_busy'],
  },
];

describe('timelineSearchService', () => {
  it('searches dreams and check-ins by keyword', () => {
    const results = searchTimeline({
      dreams,
      logs,
      filters: { query: '바다', range: 'all' },
    });

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('dream');
    expect(results[0].sourceId).toBe('d1');
  });

  it('filters by emotion id', () => {
    const results = searchTimeline({
      dreams,
      logs,
      filters: { emotionId: 'peaceful', range: 'all' },
    });

    expect(results.some(item => item.type === 'checkin' && item.sourceId === 'c1')).toBe(true);
    expect(results.some(item => item.sourceId === 'c2')).toBe(false);
  });

  it('filters dreams by symbol name', () => {
    const results = searchTimeline({
      dreams,
      logs,
      filters: { symbolName: '산', range: 'all' },
    });

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('dream');
    expect(results[0].sourceId).toBe('d2');
  });
});
