/**
 * Dream Service
 *
 * 꿈 기록, 분석, 조회를 담당하는 서비스 레이어
 * Adapter를 통해 저장소/AI와 통신
 */

import { generateId } from '../utils/id';
import { getTodayString } from '../utils/date';
import { getAIAdapter } from '../adapters';
import logger from '../utils/logger';
import useDreamStore from '../../store/useDreamStore';
import useSymbolStore from '../../store/useSymbolStore';

/**
 * 꿈 저장 및 분석
 */
export async function saveDream(content, options = {}) {
  const id = generateId();
  const now = new Date().toISOString();

  // 1. 기본 꿈 객체 생성
  const dream = {
    id,
    content,
    title: options.title || generateTitle(content),
    createdAt: now,
    updatedAt: now,
    date: getTodayString(),
    source: options.source || 'text', // text | voice
    analysis: null,
    isAnalyzing: true,
  };

  // 2. 스토어에 저장 (분석 전)
  const store = useDreamStore.getState();
  store.addDream(dream);

  // 3. AI 분석 실행
  try {
    const aiAdapter = getAIAdapter();
    const analysis = await aiAdapter.analyzeDream(content, {
      recentDreams: store.dreams.slice(0, 5),
    });

    // 4. 분석 결과 업데이트
    const analyzedDream = {
      ...dream,
      analysis,
      isAnalyzing: false,
      analyzedAt: new Date().toISOString(),
    };

    store.updateDream(id, analyzedDream);

    // 5. 심볼 사전 업데이트
    if (analysis?.symbols) {
      updateSymbolDictionary(analysis.symbols);
    }

    return analyzedDream;
  } catch (error) {
    logger.error('[DreamService] Analysis failed:', error);

    // 분석 실패해도 꿈은 저장
    store.updateDream(id, {
      isAnalyzing: false,
      analysisError: error.message,
    });

    return dream;
  }
}

/**
 * 꿈 제목 자동 생성
 */
function generateTitle(content) {
  if (!content) return '제목 없는 꿈';

  // 첫 문장 또는 처음 30자
  const firstSentence = content.split(/[.!?。]/)[0];
  if (firstSentence.length <= 30) {
    return firstSentence;
  }
  return content.slice(0, 30) + '...';
}

/**
 * 심볼 사전 업데이트
 */
function updateSymbolDictionary(symbols) {
  const symbolStore = useSymbolStore.getState();

  for (const symbol of symbols) {
    symbolStore.upsertSymbol({
      name: symbol.name,
      category: symbol.category,
      meaning: symbol.meaning,
      lastSeen: new Date().toISOString(),
    });
  }
}

/**
 * 오늘 꿈 조회
 */
export function getTodayDreams() {
  const store = useDreamStore.getState();
  const today = getTodayString();
  return store.dreams.filter(d => d.date === today);
}

/**
 * 최근 N일 꿈 조회
 */
export function getRecentDreams(days = 7) {
  const store = useDreamStore.getState();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return store.dreams.filter(d => d.date >= cutoffStr);
}

/**
 * 꿈 삭제
 */
export function deleteDream(id) {
  const store = useDreamStore.getState();
  store.removeDream(id);
}

/**
 * 꿈 통계
 */
export function getDreamStats(days = 7) {
  const dreams = getRecentDreams(days);

  if (dreams.length === 0) {
    return {
      count: 0,
      avgIntensity: 0,
      topSymbols: [],
      topEmotions: [],
    };
  }

  // 평균 강도
  const intensities = dreams
    .filter(d => d.analysis?.intensity)
    .map(d => d.analysis.intensity);
  const avgIntensity = intensities.length > 0
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : 0;

  // 상위 심볼
  const symbolCounts = {};
  for (const dream of dreams) {
    for (const symbol of (dream.analysis?.symbols || [])) {
      symbolCounts[symbol.name] = (symbolCounts[symbol.name] || 0) + 1;
    }
  }
  const topSymbols = Object.entries(symbolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // 상위 감정
  const emotionCounts = {};
  for (const dream of dreams) {
    for (const emotion of (dream.analysis?.emotions || [])) {
      emotionCounts[emotion.name] = (emotionCounts[emotion.name] || 0) + 1;
    }
  }
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    count: dreams.length,
    avgIntensity,
    topSymbols,
    topEmotions,
  };
}

/**
 * 데이터 내보내기 (JSON)
 */
export function exportDreams() {
  const store = useDreamStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    dreams: store.dreams,
  };
}

export default {
  saveDream,
  getTodayDreams,
  getRecentDreams,
  deleteDream,
  getDreamStats,
  exportDreams,
};
