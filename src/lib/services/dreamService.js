/**
 * Dream Service
 *
 * Store 기반 꿈 데이터 접근/집계 서비스.
 * (기존 깨진 API 호출을 제거하고 현재 store API와 정합되도록 정리)
 */

import useDreamStore from '../../store/useDreamStore';

/**
 * 꿈 저장
 * @param {string} content
 * @param {Object} [options={}]
 * @param {string} [options.userId]
 * @param {string} [options.voiceUrl]
 * @param {'text'|'voice'} [options.source]
 * @param {boolean} [options.autoAnalyze]
 */
export async function saveDream(content, options = {}) {
  const { userId, voiceUrl = null, autoAnalyze = true } = options;

  if (!userId) {
    throw new Error('saveDream requires userId');
  }

  return useDreamStore.getState().addDream({
    content,
    voiceUrl,
    userId,
    autoAnalyze,
  });
}

/**
 * 오늘 꿈 조회
 * @param {string} userId
 */
export function getTodayDreams(userId) {
  if (!userId) return [];
  return useDreamStore.getState().getTodayDreams(userId);
}

/**
 * 최근 N일 꿈 조회
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getRecentDreams(userId, days = 7) {
  if (!userId) return [];
  return useDreamStore.getState().getRecentDreams(userId, days);
}

/**
 * 꿈 삭제
 * @param {string} id
 */
export function deleteDream(id) {
  useDreamStore.getState().deleteDream(id);
}

/**
 * 꿈 통계
 * @param {string} userId
 * @param {number} [days=7]
 */
export function getDreamStats(userId, days = 7) {
  const dreams = getRecentDreams(userId, days);

  if (dreams.length === 0) {
    return {
      count: 0,
      avgIntensity: 0,
      topSymbols: [],
      topEmotions: [],
    };
  }

  const intensities = dreams
    .filter(d => d.analysis?.intensity)
    .map(d => d.analysis.intensity);

  const avgIntensity = intensities.length > 0
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : 0;

  const symbolCounts = {};
  const emotionCounts = {};

  for (const dream of dreams) {
    for (const symbol of (dream.analysis?.symbols || [])) {
      symbolCounts[symbol.name] = (symbolCounts[symbol.name] || 0) + 1;
    }

    for (const emotion of (dream.analysis?.emotions || [])) {
      const emotionName = emotion.name || emotion.type;
      if (!emotionName) continue;
      emotionCounts[emotionName] = (emotionCounts[emotionName] || 0) + 1;
    }
  }

  const topSymbols = Object.entries(symbolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

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
 * 데이터 내보내기
 * @param {string} [userId]
 */
export function exportDreams(userId) {
  const all = useDreamStore.getState().dreams;
  return {
    exportedAt: new Date().toISOString(),
    version: '1.1',
    dreams: userId ? all.filter(d => d.userId === userId) : all,
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
