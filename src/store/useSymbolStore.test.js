/**
 * useSymbolStore 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useSymbolStore from './useSymbolStore';

describe('useSymbolStore', () => {
  beforeEach(() => {
    useSymbolStore.getState().reset();
  });

  it('should start with empty state', () => {
    const state = useSymbolStore.getState();
    expect(state.symbols).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should add a new symbol', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '감정의 흐름',
      dreamId: 'dream-1',
    });

    const symbols = useSymbolStore.getState().symbols;
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('물');
    expect(symbols[0].meaning).toBe('감정의 흐름');
    expect(symbols[0].count).toBe(1);
    expect(symbols[0].dreamIds).toEqual(['dream-1']);
  });

  it('should update existing symbol count', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '감정의 흐름',
      dreamId: 'dream-1',
    });

    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '새로운 의미',
      dreamId: 'dream-2',
    });

    const symbols = useSymbolStore.getState().symbols;
    expect(symbols).toHaveLength(1);
    expect(symbols[0].count).toBe(2);
    expect(symbols[0].dreamIds).toEqual(['dream-1', 'dream-2']);
  });

  it('should not duplicate dreamIds', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '감정의 흐름',
      dreamId: 'dream-1',
    });

    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '감정의 흐름',
      dreamId: 'dream-1',
    });

    const symbols = useSymbolStore.getState().symbols;
    expect(symbols[0].dreamIds).toEqual(['dream-1']);
    expect(symbols[0].count).toBe(1);
  });

  it('should find symbol by name', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '바다',
      meaning: '무의식',
      dreamId: 'dream-1',
    });

    const found = useSymbolStore.getState().getSymbolByName('user-1', '바다');
    expect(found).toBeDefined();
    expect(found.meaning).toBe('무의식');
  });

  it('should return undefined for unknown symbol name', () => {
    const found = useSymbolStore.getState().getSymbolByName('user-1', '없는심볼');
    expect(found).toBeUndefined();
  });

  it('should update symbol meaning', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '원래 의미',
      dreamId: 'dream-1',
    });

    const symbol = useSymbolStore.getState().symbols[0];
    useSymbolStore.getState().updateSymbolMeaning(symbol.id, '수정된 의미');

    const updated = useSymbolStore.getState().getSymbolById(symbol.id);
    expect(updated.meaning).toBe('수정된 의미');
  });

  it('should delete a symbol', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1',
      name: '물',
      meaning: '감정',
      dreamId: 'dream-1',
    });

    const symbol = useSymbolStore.getState().symbols[0];
    useSymbolStore.getState().deleteSymbol(symbol.id);

    expect(useSymbolStore.getState().symbols).toHaveLength(0);
  });

  it('should get user symbols sorted by count', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '물', meaning: 'a', dreamId: 'd1',
    });
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '물', meaning: 'a', dreamId: 'd2',
    });
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '산', meaning: 'b', dreamId: 'd1',
    });

    const symbols = useSymbolStore.getState().getUserSymbols('user-1');
    expect(symbols).toHaveLength(2);
    expect(symbols[0].name).toBe('물'); // count=2
    expect(symbols[1].name).toBe('산'); // count=1
  });

  it('should get top symbols with limit', () => {
    for (let i = 0; i < 5; i++) {
      useSymbolStore.getState().addOrUpdateSymbol({
        userId: 'user-1', name: `심볼${i}`, meaning: `의미${i}`, dreamId: `d${i}`,
      });
    }

    const top3 = useSymbolStore.getState().getTopSymbols('user-1', 3);
    expect(top3).toHaveLength(3);
  });

  it('should search symbols by name and meaning', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '물', meaning: '감정의 흐름', dreamId: 'd1',
    });
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '산', meaning: '도전', dreamId: 'd2',
    });

    const byName = useSymbolStore.getState().searchSymbols('user-1', '물');
    expect(byName).toHaveLength(1);

    const byMeaning = useSymbolStore.getState().searchSymbols('user-1', '감정');
    expect(byMeaning).toHaveLength(1);
    expect(byMeaning[0].name).toBe('물');
  });

  it('should sync symbols from analysis', () => {
    useSymbolStore.getState().syncSymbolsFromAnalysis('user-1', 'dream-1', [
      { name: '물', meaning: '감정의 흐름' },
      { name: '바다', meaning: '무의식' },
    ]);

    expect(useSymbolStore.getState().symbols).toHaveLength(2);
    expect(useSymbolStore.getState().getTotalSymbolCount('user-1')).toBe(2);
  });

  it('should isolate symbols by user', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '물', meaning: 'a', dreamId: 'd1',
    });
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-2', name: '산', meaning: 'b', dreamId: 'd2',
    });

    expect(useSymbolStore.getState().getUserSymbols('user-1')).toHaveLength(1);
    expect(useSymbolStore.getState().getUserSymbols('user-2')).toHaveLength(1);
    expect(useSymbolStore.getState().getTotalSymbolCount('user-1')).toBe(1);
  });

  it('should reset state', () => {
    useSymbolStore.getState().addOrUpdateSymbol({
      userId: 'user-1', name: '물', meaning: 'a', dreamId: 'd1',
    });

    useSymbolStore.getState().reset();
    expect(useSymbolStore.getState().symbols).toEqual([]);
  });
});
