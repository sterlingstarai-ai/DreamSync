/**
 * Symbol Service
 *
 * 개인 심볼 사전 관리
 */

import useSymbolStore from '../../store/useSymbolStore';
import useDreamStore from '../../store/useDreamStore';

/**
 * 심볼 조회
 */
export function getSymbols(options = {}) {
  const store = useSymbolStore.getState();
  let symbols = [...store.symbols];

  // 카테고리 필터
  if (options.category && options.category !== 'all') {
    symbols = symbols.filter(s => s.category === options.category);
  }

  // 검색
  if (options.query) {
    const query = options.query.toLowerCase();
    symbols = symbols.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.meaning?.toLowerCase().includes(query) ||
      s.personalMeaning?.toLowerCase().includes(query)
    );
  }

  // 정렬
  switch (options.sortBy) {
    case 'frequency':
      symbols.sort((a, b) => b.frequency - a.frequency);
      break;
    case 'recent':
      symbols.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
      break;
    case 'name':
      symbols.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      symbols.sort((a, b) => b.frequency - a.frequency);
  }

  return symbols;
}

/**
 * 심볼 상세 조회
 */
export function getSymbol(name) {
  const store = useSymbolStore.getState();
  return store.symbols.find(s => s.name === name);
}

/**
 * 심볼에 개인 의미 추가/수정
 */
export function updatePersonalMeaning(name, personalMeaning) {
  const store = useSymbolStore.getState();
  store.upsertSymbol({ name, personalMeaning });
}

/**
 * 심볼에 메모 추가
 */
export function updateSymbolNotes(name, notes) {
  const store = useSymbolStore.getState();
  store.upsertSymbol({ name, notes });
}

/**
 * 심볼 관련 꿈 조회
 */
export function getDreamsWithSymbol(symbolName) {
  const dreamStore = useDreamStore.getState();

  return dreamStore.dreams.filter(dream =>
    dream.analysis?.symbols?.some(s => s.name === symbolName)
  );
}

/**
 * 심볼 통계
 */
export function getSymbolStats() {
  const store = useSymbolStore.getState();
  const symbols = store.symbols;

  if (symbols.length === 0) {
    return {
      totalCount: 0,
      categoryBreakdown: {},
      topSymbols: [],
      recentSymbols: [],
    };
  }

  // 카테고리별 집계
  const categoryBreakdown = {};
  for (const symbol of symbols) {
    const cat = symbol.category || 'abstract';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  // 상위 심볼
  const topSymbols = [...symbols]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // 최근 심볼
  const recentSymbols = [...symbols]
    .filter(s => s.lastSeen)
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
 */
export function analyzeSymbolTrends() {
  const dreamStore = useDreamStore.getState();

  // 최근 7일 vs 이전 7일 비교
  const now = new Date();
  const recent7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const older7 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const recentDreams = dreamStore.dreams.filter(d => d.date >= recent7);
  const olderDreams = dreamStore.dreams.filter(d => d.date >= older7 && d.date < recent7);

  // 최근 심볼 빈도
  const recentSymbols = {};
  for (const dream of recentDreams) {
    for (const symbol of (dream.analysis?.symbols || [])) {
      recentSymbols[symbol.name] = (recentSymbols[symbol.name] || 0) + 1;
    }
  }

  // 이전 심볼 빈도
  const olderSymbols = {};
  for (const dream of olderDreams) {
    for (const symbol of (dream.analysis?.symbols || [])) {
      olderSymbols[symbol.name] = (olderSymbols[symbol.name] || 0) + 1;
    }
  }

  // 트렌드 계산
  const trends = [];
  const allSymbols = new Set([...Object.keys(recentSymbols), ...Object.keys(olderSymbols)]);

  for (const name of allSymbols) {
    const recent = recentSymbols[name] || 0;
    const older = olderSymbols[name] || 0;

    let trend = 'stable';
    if (recent > older) trend = 'up';
    else if (recent < older) trend = 'down';

    if (recent > 0 || older > 0) {
      trends.push({
        name,
        recent,
        older,
        trend,
        change: recent - older,
      });
    }
  }

  // 증가 심볼
  const increasing = trends
    .filter(t => t.trend === 'up')
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  // 감소 심볼
  const decreasing = trends
    .filter(t => t.trend === 'down')
    .sort((a, b) => a.change - b.change)
    .slice(0, 5);

  // 새로 등장
  const newSymbols = trends
    .filter(t => t.older === 0 && t.recent > 0)
    .slice(0, 5);

  return {
    increasing,
    decreasing,
    newSymbols,
  };
}

/**
 * 심볼 데이터 내보내기
 */
export function exportSymbols() {
  const store = useSymbolStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    symbols: store.symbols,
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
