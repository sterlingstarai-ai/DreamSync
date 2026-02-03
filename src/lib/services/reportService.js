/**
 * Report Service
 *
 * 주간/월간 리포트 생성, 패턴 분석, 상관관계 발견
 */

import { getDaysAgo, getWeekRange } from '../utils/date';
import { getAIAdapter } from '../adapters';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useForecastStore from '../../store/useForecastStore';
import useSymbolStore from '../../store/useSymbolStore';

/**
 * 주간 리포트 생성
 */
export async function generateWeeklyReport() {
  const data = collectWeeklyData();

  // 패턴 분석
  const patterns = analyzePatterns(data);

  // 상관관계 분석
  const correlations = analyzeCorrelations(data);

  // AI 인사이트 생성 (선택적)
  let aiInsights = null;
  try {
    const aiAdapter = getAIAdapter();
    aiInsights = await aiAdapter.generatePatternInsights(data);
  } catch (error) {
    console.log('[ReportService] AI insights skipped:', error.message);
  }

  return {
    period: getWeekRange(),
    generatedAt: new Date().toISOString(),
    summary: generateSummary(data),
    stats: data.stats,
    patterns,
    correlations,
    aiInsights,
    charts: {
      condition: data.conditionTrend,
      stress: data.stressTrend,
      sleep: data.sleepTrend,
      dream: data.dreamTrend,
    },
  };
}

/**
 * 주간 데이터 수집
 */
function collectWeeklyData() {
  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const forecastStore = useForecastStore.getState();
  const symbolStore = useSymbolStore.getState();

  const cutoff = getDaysAgo(7);

  // 최근 7일 데이터
  const dreams = dreamStore.dreams.filter(d => d.date >= cutoff);
  const checkIns = checkInStore.logs.filter(l => l.date >= cutoff);
  const forecasts = forecastStore.forecasts.filter(f => f.date >= cutoff);

  // 트렌드 데이터 생성
  const conditionTrend = [];
  const stressTrend = [];
  const sleepTrend = [];
  const dreamTrend = [];

  for (let i = 6; i >= 0; i--) {
    const date = getDaysAgo(i);
    const dayCheckIn = checkIns.find(c => c.date === date);
    const dayDreams = dreams.filter(d => d.date === date);

    conditionTrend.push({
      date,
      value: dayCheckIn?.condition || 0,
    });

    stressTrend.push({
      date,
      value: dayCheckIn?.stressLevel || 0,
    });

    sleepTrend.push({
      date,
      value: dayCheckIn?.sleep?.duration ? dayCheckIn.sleep.duration / 60 : 0,
    });

    dreamTrend.push({
      date,
      value: dayDreams.length,
    });
  }

  // 통계 계산
  const avgCondition = checkIns.length > 0
    ? checkIns.reduce((s, c) => s + (c.condition || 0), 0) / checkIns.length
    : 0;

  const avgStress = checkIns.length > 0
    ? checkIns.reduce((s, c) => s + (c.stressLevel || 0), 0) / checkIns.length
    : 0;

  const avgSleep = checkIns.filter(c => c.sleep?.duration).length > 0
    ? checkIns.filter(c => c.sleep?.duration)
        .reduce((s, c) => s + c.sleep.duration, 0) /
        checkIns.filter(c => c.sleep?.duration).length / 60
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
      emotionCounts[emotion.type] = (emotionCounts[emotion.type] || 0) + 1;
    }
  }
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    dreams,
    checkIns,
    forecasts,
    conditionTrend,
    stressTrend,
    sleepTrend,
    dreamTrend,
    stats: {
      dreamCount: dreams.length,
      checkInCount: checkIns.length,
      avgCondition: Math.round(avgCondition * 10) / 10,
      avgStress: Math.round(avgStress * 10) / 10,
      avgSleep: Math.round(avgSleep * 10) / 10,
      topSymbols,
      topEmotions,
    },
  };
}

/**
 * 패턴 분석
 */
function analyzePatterns(data) {
  const patterns = [];

  // 컨디션 패턴
  const conditionValues = data.conditionTrend.map(d => d.value).filter(v => v > 0);
  if (conditionValues.length >= 3) {
    const avg = conditionValues.reduce((a, b) => a + b, 0) / conditionValues.length;
    const trend = conditionValues[conditionValues.length - 1] > conditionValues[0] ? 'up' :
                  conditionValues[conditionValues.length - 1] < conditionValues[0] ? 'down' : 'stable';

    patterns.push({
      title: '컨디션 추이',
      description: avg >= 4 ? '이번 주 컨디션이 양호했어요.' :
                   avg >= 3 ? '이번 주 컨디션이 보통이었어요.' :
                   '이번 주 컨디션이 다소 낮았어요.',
      trend,
      emoji: avg >= 4 ? '😊' : avg >= 3 ? '😐' : '😔',
    });
  }

  // 스트레스 패턴
  const stressValues = data.stressTrend.map(d => d.value).filter(v => v > 0);
  if (stressValues.length >= 3) {
    const avg = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
    const trend = stressValues[stressValues.length - 1] < stressValues[0] ? 'up' : // 스트레스 감소 = 좋음
                  stressValues[stressValues.length - 1] > stressValues[0] ? 'down' : 'stable';

    patterns.push({
      title: '스트레스 수준',
      description: avg <= 2 ? '스트레스가 낮게 유지되고 있어요.' :
                   avg <= 3 ? '스트레스가 적정 수준이에요.' :
                   '스트레스 관리가 필요해 보여요.',
      trend,
      emoji: avg <= 2 ? '😌' : avg <= 3 ? '😐' : '😤',
    });
  }

  // 수면 패턴
  const sleepValues = data.sleepTrend.map(d => d.value).filter(v => v > 0);
  if (sleepValues.length >= 3) {
    const avg = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;

    patterns.push({
      title: '수면 시간',
      description: avg >= 7 ? '충분한 수면을 취하고 있어요.' :
                   avg >= 6 ? '수면 시간이 적정해요.' :
                   '수면 시간이 다소 부족해요.',
      trend: avg >= 7 ? 'up' : avg >= 6 ? 'stable' : 'down',
      emoji: avg >= 7 ? '😴' : avg >= 6 ? '🌙' : '😫',
    });
  }

  // 꿈 기록 패턴
  if (data.dreams.length > 0) {
    patterns.push({
      title: '꿈 기록',
      description: `이번 주 ${data.dreams.length}개의 꿈을 기록했어요.`,
      trend: data.dreams.length >= 4 ? 'up' : data.dreams.length >= 2 ? 'stable' : 'down',
      emoji: '💭',
    });
  }

  return patterns;
}

/**
 * 상관관계 분석
 */
function analyzeCorrelations(data) {
  const correlations = [];

  // 수면-컨디션 상관관계
  const sleepConditionPairs = data.checkIns
    .filter(c => c.sleep?.duration && c.condition)
    .map(c => ({ sleep: c.sleep.duration / 60, condition: c.condition }));

  if (sleepConditionPairs.length >= 3) {
    const correlation = calculateCorrelation(
      sleepConditionPairs.map(p => p.sleep),
      sleepConditionPairs.map(p => p.condition)
    );

    if (Math.abs(correlation) > 0.3) {
      correlations.push({
        factor1: '수면 시간',
        factor2: '컨디션',
        strength: Math.abs(correlation),
        direction: correlation > 0 ? 'positive' : 'negative',
        insight: correlation > 0
          ? '수면 시간이 길수록 컨디션이 좋아지는 경향이 있어요.'
          : '수면 시간과 컨디션 사이에 역관계가 있어요.',
      });
    }
  }

  // 스트레스-컨디션 상관관계
  const stressConditionPairs = data.checkIns
    .filter(c => c.stressLevel && c.condition)
    .map(c => ({ stress: c.stressLevel, condition: c.condition }));

  if (stressConditionPairs.length >= 3) {
    const correlation = calculateCorrelation(
      stressConditionPairs.map(p => p.stress),
      stressConditionPairs.map(p => p.condition)
    );

    if (Math.abs(correlation) > 0.3) {
      correlations.push({
        factor1: '스트레스',
        factor2: '컨디션',
        strength: Math.abs(correlation),
        direction: correlation > 0 ? 'positive' : 'negative',
        insight: correlation < 0
          ? '스트레스가 낮을수록 컨디션이 좋아요.'
          : '스트레스와 컨디션 사이에 예상치 못한 관계가 있어요.',
      });
    }
  }

  return correlations;
}

/**
 * 피어슨 상관계수 계산
 */
function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * 요약 생성
 */
function generateSummary(data) {
  const { stats } = data;

  const parts = [];

  if (stats.dreamCount > 0) {
    parts.push(`${stats.dreamCount}개의 꿈을 기록했어요`);
  }

  if (stats.checkInCount > 0) {
    parts.push(`${stats.checkInCount}일 체크인했어요`);
  }

  if (stats.avgCondition > 0) {
    const conditionText = stats.avgCondition >= 4 ? '좋은' :
                          stats.avgCondition >= 3 ? '보통인' : '낮은';
    parts.push(`평균 컨디션이 ${conditionText} 편이었어요`);
  }

  return parts.join(', ') + '.';
}

/**
 * 데이터 내보내기 (JSON)
 */
export async function exportAllData() {
  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const forecastStore = useForecastStore.getState();
  const symbolStore = useSymbolStore.getState();

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: {
      dreams: dreamStore.dreams,
      checkIns: checkInStore.logs,
      forecasts: forecastStore.forecasts,
      symbols: symbolStore.symbols,
    },
  };
}

export default {
  generateWeeklyReport,
  exportAllData,
};
