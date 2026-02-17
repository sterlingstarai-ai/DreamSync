/**
 * Symbol Service
 *
 * Store 기반 심볼 사전 접근/집계 서비스.
 */

import useSymbolStore from '../../store/useSymbolStore';
import useDreamStore from '../../store/useDreamStore';

function resolveSymbol(userId, idOrName) {
  const store = useSymbolStore.getState();
  return store.symbols.find(
    s => s.userId === userId && (s.id === idOrName || s.name === idOrName),
  );
}

/**
 * 심볼 조회
 * @param {Object} [options={}]
 * @param {string} [options.userId]
 * @param {string} [options.category]
 * @param {string} [options.query]
 * @param {'count'|'frequency'|'recent'|'name'} [options.sortBy]
 */
export function getSymbols(options = {}) {
  const { userId, category, query, sortBy = 'count' } = options;
  if (!userId) return [];

  const store = useSymbolStore.getState();
  let symbols = store.getUserSymbols(userId);

  if (category && category !== 'all') {
    symbols = symbols.filter(s => s.category === category);
  }

  if (query) {
    const q = query.toLowerCase();
    symbols = symbols.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.meaning || '').toLowerCase().includes(q),
    );
  }

  switch (sortBy) {
    case 'name':
      symbols = [...symbols].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'recent':
      symbols = [...symbols].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      break;
    case 'frequency':
    case 'count':
    default:
      symbols = [...symbols].sort((a, b) => b.count - a.count);
      break;
  }

  return symbols;
}

/**
 * 심볼 상세 조회
 * @param {string} userId
 * @param {string} idOrName
 */
export function getSymbol(userId, idOrName) {
  if (!userId || !idOrName) return undefined;
  return resolveSymbol(userId, idOrName);
}

/**
 * 심볼 개인 의미 수정
 * @param {string} userId
 * @param {string} idOrName
 * @param {string} personalMeaning
 */
export function updatePersonalMeaning(userId, idOrName, personalMeaning) {
  const symbol = resolveSymbol(userId, idOrName);
  if (!symbol) return;

  useSymbolStore.getState().updateSymbolMeaning(symbol.id, personalMeaning);
}

/**
 * 심볼 메모 수정
 * @param {string} userId
 * @param {string} idOrName
 * @param {string} notes
 */
export function updateSymbolNotes(userId, idOrName, notes) {
  const symbol = resolveSymbol(userId, idOrName);
  if (!symbol) return;

  useSymbolStore.setState((state) => ({
    symbols: state.symbols.map(s =>
      s.id === symbol.id
        ? { ...s, notes, updatedAt: new Date().toISOString() }
        : s,
    ),
  }));
}

/**
 * 심볼 관련 꿈 조회
 * @param {string} userId
 * @param {string} symbolName
 */
export function getDreamsWithSymbol(userId, symbolName) {
  if (!userId || !symbolName) return [];

  const dreamStore = useDreamStore.getState();
  return dreamStore.getDreamsByUser(userId).filter(dream =>
    dream.analysis?.symbols?.some(s => s.name === symbolName),
  );
}

/**
 * 심볼 통계
 * @param {string} userId
 */
export function getSymbolStats(userId) {
  const symbols = getSymbols({ userId, sortBy: 'count' });

  if (symbols.length === 0) {
    return {
      totalCount: 0,
      categoryBreakdown: {},
      topSymbols: [],
      recentSymbols: [],
    };
  }

  const categoryBreakdown = {};
  for (const symbol of symbols) {
    const category = symbol.category || 'uncategorized';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
  }

  const topSymbols = [...symbols]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentSymbols = [...symbols]
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, 10);

  return {
    totalCount: symbols.length,
    categoryBreakdown,
    topSymbols,
    recentSymbols,
  };
}

/**
 * 심볼 트렌드 분석
 * @param {string} userId
 */
export function analyzeSymbolTrends(userId) {
  if (!userId) {
    return { increasing: [], decreasing: [], newSymbols: [] };
  }

  const symbols = useSymbolStore.getState().getUserSymbols(userId);

  const increasing = symbols
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(s => ({ name: s.name, recent: s.count, older: 0, trend: 'up', change: s.count }));

  return {
    increasing,
    decreasing: [],
    newSymbols: [],
  };
}

/**
 * 심볼 데이터 내보내기
 * @param {string} [userId]
 */
export function exportSymbols(userId) {
  const all = useSymbolStore.getState().symbols;

  return {
    exportedAt: new Date().toISOString(),
    version: '1.1',
    symbols: userId ? all.filter(s => s.userId === userId) : all,
  };
}

export default {
  getSymbols,
  getSymbol,
  updatePersonalMeaning,
  updateSymbolNotes,
  getDreamsWithSymbol,
  getSymbolStats,
  analyzeSymbolTrends,
  exportSymbols,
};
