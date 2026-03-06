import { describe, expect, it } from 'vitest';
import { rebuildPersonalSymbols } from './deriveSymbols';

describe('rebuildPersonalSymbols', () => {
  it('rebuilds symbol counts from dreams and preserves custom meaning', () => {
    const symbols = rebuildPersonalSymbols({
      userId: 'user-1',
      dreams: [
        {
          id: 'dream-1',
          userId: 'user-1',
          date: '2026-03-05',
          createdAt: '2026-03-05T08:00:00.000Z',
          updatedAt: '2026-03-05T08:30:00.000Z',
          analysis: {
            symbols: [
              { name: '바다', meaning: '감정의 흐름' },
              { name: '새벽', meaning: '새로운 시작' },
            ],
          },
        },
        {
          id: 'dream-2',
          userId: 'user-1',
          date: '2026-03-06',
          createdAt: '2026-03-06T08:00:00.000Z',
          updatedAt: '2026-03-06T08:30:00.000Z',
          analysis: {
            symbols: [
              { name: '바다', meaning: '불확실성' },
            ],
          },
        },
      ],
      existingSymbols: [
        {
          id: 'symbol-sea',
          userId: 'user-1',
          name: '바다',
          meaning: '내게는 휴식의 상징',
          count: 999,
          dreamIds: ['legacy'],
        },
      ],
    });

    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toMatchObject({
      id: 'symbol-sea',
      name: '바다',
      meaning: '내게는 휴식의 상징',
      count: 2,
      dreamIds: ['dream-1', 'dream-2'],
      firstSeen: '2026-03-05',
      lastSeen: '2026-03-06',
    });
    expect(symbols[1]).toMatchObject({
      name: '새벽',
      count: 1,
      dreamIds: ['dream-1'],
    });
  });
});

