import { beforeEach, describe, expect, it } from 'vitest';
import { loadSampleData } from './sampleData';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useSymbolStore from '../../store/useSymbolStore';

describe('loadSampleData', () => {
  beforeEach(() => {
    useDreamStore.getState().reset();
    useCheckInStore.getState().reset();
    useSymbolStore.getState().reset();
  });

  it('loads sample data and syncs symbols from sample dreams', () => {
    const result = loadSampleData('user-1');

    const dreams = useDreamStore.getState().getDreamsByUser('user-1');
    const checkIns = useCheckInStore.getState().getRecentLogs('user-1', 7);
    const symbols = useSymbolStore.getState().getUserSymbols('user-1');

    expect(result.added).toBe(true);
    expect(result.dreamsAdded).toBe(2);
    expect(result.checkInsAdded).toBe(2);
    expect(result.symbolsSynced).toBe(4);

    expect(dreams).toHaveLength(2);
    expect(checkIns).toHaveLength(2);
    expect(symbols.map(s => s.name).sort()).toEqual(['돌고래', '바다', '산', '일출'].sort());
    expect(symbols.every(s => s.count === 1)).toBe(true);
  });

  it('does not duplicate sample data when loaded multiple times for the same user', () => {
    loadSampleData('user-1');
    const second = loadSampleData('user-1');

    const dreams = useDreamStore.getState().getDreamsByUser('user-1');
    const checkIns = useCheckInStore.getState().getRecentLogs('user-1', 7);
    const symbols = useSymbolStore.getState().getUserSymbols('user-1');

    expect(second.added).toBe(false);
    expect(second.dreamsAdded).toBe(0);
    expect(second.checkInsAdded).toBe(0);
    expect(second.symbolsSynced).toBe(4);

    expect(dreams).toHaveLength(2);
    expect(checkIns).toHaveLength(2);
    expect(symbols).toHaveLength(4);
    expect(symbols.every(s => s.count === 1)).toBe(true);
  });
});
