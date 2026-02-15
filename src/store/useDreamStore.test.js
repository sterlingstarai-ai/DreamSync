/**
 * useDreamStore 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useDreamStore from './useDreamStore';
import useSymbolStore from './useSymbolStore';

// Mock analyzeDream
vi.mock('../lib/ai/analyzeDream', () => ({
  analyzeDream: vi.fn().mockResolvedValue({
    success: true,
    data: {
      symbols: [{ name: '물', meaning: '감정의 흐름', frequency: 1 }],
      emotions: [{ name: '불안한', intensity: 7, color: '#f59e0b' }],
      themes: ['자아 탐색'],
      intensity: 7,
      interpretation: '테스트 해석',
      actionSuggestion: '테스트 제안',
      reflectionQuestions: ['테스트 질문?'],
    },
  }),
}));

describe('useDreamStore', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
  });

  it('should start with empty state', () => {
    const state = useDreamStore.getState();
    expect(state.dreams).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isAnalyzing).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should add a dream', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '바다에서 수영하는 꿈을 꿨다',
      userId: 'user-1',
      autoAnalyze: false,
    });

    expect(dream).toBeDefined();
    expect(dream.id).toBeDefined();
    expect(dream.content).toBe('바다에서 수영하는 꿈을 꿨다');
    expect(dream.userId).toBe('user-1');

    const state = useDreamStore.getState();
    expect(state.dreams).toHaveLength(1);
    expect(state.dreams[0].id).toBe(dream.id);
  });

  it('should find dream by id', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '하늘을 나는 꿈',
      userId: 'user-1',
      autoAnalyze: false,
    });

    const found = useDreamStore.getState().getDreamById(dream.id);
    expect(found).toBeDefined();
    expect(found.content).toBe('하늘을 나는 꿈');
  });

  it('should return undefined for unknown dream id', () => {
    const found = useDreamStore.getState().getDreamById('nonexistent');
    expect(found).toBeUndefined();
  });

  it('should update dream content', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '원래 내용',
      userId: 'user-1',
      autoAnalyze: false,
    });

    useDreamStore.getState().updateDreamContent(dream.id, '수정된 내용');

    const updated = useDreamStore.getState().getDreamById(dream.id);
    expect(updated.content).toBe('수정된 내용');
    expect(updated.updatedAt).toBeDefined();
  });

  it('should delete a dream', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '삭제할 꿈',
      userId: 'user-1',
      autoAnalyze: false,
    });

    expect(useDreamStore.getState().dreams).toHaveLength(1);

    useDreamStore.getState().deleteDream(dream.id);

    expect(useDreamStore.getState().dreams).toHaveLength(0);
  });

  it('should filter dreams by user', async () => {
    await useDreamStore.getState().addDream({
      content: '꿈 1', userId: 'user-1', autoAnalyze: false,
    });
    await useDreamStore.getState().addDream({
      content: '꿈 2', userId: 'user-2', autoAnalyze: false,
    });

    const user1Dreams = useDreamStore.getState().getDreamsByUser('user-1');
    expect(user1Dreams).toHaveLength(1);
    expect(user1Dreams[0].content).toBe('꿈 1');
  });

  it('should get today dreams', async () => {
    await useDreamStore.getState().addDream({
      content: '오늘의 꿈', userId: 'user-1', autoAnalyze: false,
    });

    const todayDreams = useDreamStore.getState().getTodayDreams('user-1');
    expect(todayDreams).toHaveLength(1);
  });

  it('should extract symbols from analyzed dreams', async () => {
    const dream = await useDreamStore.getState().addDream({
      content: '바다에서 물고기를 본 꿈',
      userId: 'user-1',
      autoAnalyze: false,
    });

    // Manually set analysis
    useDreamStore.setState((state) => ({
      dreams: state.dreams.map(d =>
        d.id === dream.id
          ? { ...d, analysis: { symbols: [{ name: '물', meaning: '감정의 흐름' }, { name: '바다', meaning: '무의식' }] } }
          : d
      ),
    }));

    const symbols = useDreamStore.getState().getAllSymbols('user-1');
    expect(symbols).toHaveLength(2);
    expect(symbols[0].name).toBe('물');
  });

  it('should reset state', async () => {
    await useDreamStore.getState().addDream({
      content: '꿈', userId: 'user-1', autoAnalyze: false,
    });

    useDreamStore.getState().reset();
    const state = useDreamStore.getState();
    expect(state.dreams).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  describe('cascading symbol delete', () => {
    beforeEach(() => {
      useSymbolStore.getState().reset();
    });

    it('should remove dreamId from symbol on dream delete', async () => {
      const dream = await useDreamStore.getState().addDream({
        content: '바다에서 수영', userId: 'user-1', autoAnalyze: false,
      });

      // Manually set analysis with symbols
      useDreamStore.setState((state) => ({
        dreams: state.dreams.map(d =>
          d.id === dream.id
            ? { ...d, analysis: { symbols: [{ name: '바다', meaning: '무의식' }] } }
            : d
        ),
      }));

      // Add symbol to symbol store with this dream
      useSymbolStore.getState().addOrUpdateSymbol({
        userId: 'user-1', name: '바다', meaning: '무의식', dreamId: dream.id,
      });

      // Add a second dream referencing same symbol
      const dream2 = await useDreamStore.getState().addDream({
        content: '바다에서 서핑', userId: 'user-1', autoAnalyze: false,
      });
      useSymbolStore.getState().addOrUpdateSymbol({
        userId: 'user-1', name: '바다', meaning: '무의식', dreamId: dream2.id,
      });

      expect(useSymbolStore.getState().symbols).toHaveLength(1);
      expect(useSymbolStore.getState().symbols[0].dreamIds).toHaveLength(2);

      // Delete first dream
      useDreamStore.getState().deleteDream(dream.id);

      // Symbol should still exist but with only dream2
      const sym = useSymbolStore.getState().symbols[0];
      expect(sym.dreamIds).toHaveLength(1);
      expect(sym.dreamIds[0]).toBe(dream2.id);
      expect(sym.count).toBe(1);
    });

    it('should delete orphan symbol when last dream is removed', async () => {
      const dream = await useDreamStore.getState().addDream({
        content: '물속에서 잠수', userId: 'user-1', autoAnalyze: false,
      });

      useDreamStore.setState((state) => ({
        dreams: state.dreams.map(d =>
          d.id === dream.id
            ? { ...d, analysis: { symbols: [{ name: '물', meaning: '감정' }] } }
            : d
        ),
      }));

      useSymbolStore.getState().addOrUpdateSymbol({
        userId: 'user-1', name: '물', meaning: '감정', dreamId: dream.id,
      });

      expect(useSymbolStore.getState().symbols).toHaveLength(1);

      useDreamStore.getState().deleteDream(dream.id);

      expect(useSymbolStore.getState().symbols).toHaveLength(0);
    });
  });

  describe('data cap', () => {
    it('should cap dreams at MAX_DREAMS (500)', async () => {
      // Pre-fill with 500 dreams
      const dreams = Array.from({ length: 500 }, (_, i) => ({
        id: `dream-${i}`,
        userId: 'user-1',
        content: `꿈 ${i}`,
        voiceUrl: null,
        analysis: null,
        createdAt: new Date(2025, 0, i + 1).toISOString(),
        updatedAt: new Date(2025, 0, i + 1).toISOString(),
      }));
      useDreamStore.setState({ dreams });

      // Add one more
      await useDreamStore.getState().addDream({
        content: '초과 꿈', userId: 'user-1', autoAnalyze: false,
      });

      expect(useDreamStore.getState().dreams).toHaveLength(500);
      expect(useDreamStore.getState().dreams[0].content).toBe('초과 꿈');
    });
  });
});
