/**
 * UHS Service (Phase 4)
 *
 * UHS (Unconscious Health Score) 계산 및 관리
 *
 * ⚠️ 중요: 의료/진단/치료 표현 절대 금지
 * - "참고 지표" 고정 문구 사용
 * - 질환명, 처방, 진단 표현 금지
 */

import { calculateUHS, getUHSLevel, UHS_DISCLAIMER } from '../scoring';
import { getDaysAgo } from '../utils/date';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';
import useForecastStore from '../../store/useForecastStore';

// 분석 기간 상수
const ANALYSIS_PERIOD = {
  RECENT_DAYS: 7,
  COMPARISON_DAYS: 14,
};

// 트렌드 임계값
const TREND_THRESHOLD = {
  CHANGE_PERCENT: 10,
  RATIO_UP: 1.1,
  RATIO_DOWN: 0.9,
};

// 변화량 범위
const CHANGE_RANGE = { min: -100, max: 100 };

/**
 * 현재 UHS 점수 계산
 */
export function calculateCurrentUHS() {
  const data = collectUHSData();
  return calculateUHS(data);
}

/**
 * UHS 데이터 수집
 */
function collectUHSData() {
  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const forecastStore = useForecastStore.getState();

  const cutoff = getDaysAgo(ANALYSIS_PERIOD.RECENT_DAYS);

  // 최근 7일 체크인
  const recentCheckIns = checkInStore.logs.filter(l => l.date >= cutoff);

  // 수면 데이터
  const sleepData = recentCheckIns
    .filter(c => c.sleep)
    .map(c => c.sleep);

  const avgSleepDuration = sleepData.length > 0
    ? sleepData.reduce((s, d) => s + (d.duration || 0), 0) / sleepData.length
    : null;

  const avgSleepQuality = sleepData.length > 0
    ? sleepData.reduce((s, d) => s + (d.quality || 3), 0) / sleepData.length
    : null;

  // 스트레스 데이터
  const stressLevels = recentCheckIns
    .filter(c => c.stressLevel)
    .map(c => c.stressLevel);

  const avgStress = stressLevels.length > 0
    ? stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length
    : null;

  // 꿈 데이터
  const recentDreams = dreamStore.dreams.filter(d => d.date >= cutoff);
  const dreamIntensities = recentDreams
    .filter(d => d.analysis?.intensity)
    .map(d => d.analysis.intensity);

  const avgIntensity = dreamIntensities.length > 0
    ? dreamIntensities.reduce((a, b) => a + b, 0) / dreamIntensities.length
    : null;

  // 심볼 다양성
  const allSymbols = new Set();
  for (const dream of recentDreams) {
    for (const symbol of (dream.analysis?.symbols || [])) {
      allSymbols.add(symbol.name);
    }
  }

  // 컨디션 데이터 (기분 변동성)
  const conditions = recentCheckIns
    .filter(c => c.condition)
    .map(c => c.condition);

  // 예측 정확도 (null과 undefined 모두 제외)
  const recentForecasts = forecastStore.forecasts
    .filter(f => f.date >= cutoff && f.accuracy != null);

  const avgAccuracy = recentForecasts.length > 0
    ? recentForecasts.reduce((s, f) => s + f.accuracy, 0) / recentForecasts.length
    : null;

  return {
    sleep: {
      duration: avgSleepDuration,
      quality: avgSleepQuality,
    },
    stress: {
      stressLevel: avgStress,
    },
    dream: {
      avgIntensity,
      symbolVariety: allSymbols.size,
      dreamCount: recentDreams.length,
    },
    mood: {
      conditions,
    },
    prediction: {
      avgAccuracy,
    },
  };
}

/**
 * UHS 상세 정보
 */
export function getUHSDetails() {
  const result = calculateCurrentUHS();
  const { level, description } = getUHSLevel(result.score);

  return {
    ...result,
    level,
    description,
    disclaimer: UHS_DISCLAIMER,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * UHS 트렌드 계산 (최근 vs 이전)
 */
export function getUHSTrend() {
  // 현재 구현에서는 저장된 UHS 히스토리가 없으므로
  // 체크인 데이터로 간접 추정

  const checkInStore = useCheckInStore.getState();

  const recentCutoff = getDaysAgo(ANALYSIS_PERIOD.RECENT_DAYS);
  const olderCutoff = getDaysAgo(ANALYSIS_PERIOD.COMPARISON_DAYS);

  const recent7 = checkInStore.logs.filter(l => l.date >= recentCutoff);
  const older7 = checkInStore.logs.filter(
    l => l.date >= olderCutoff && l.date < recentCutoff
  );

  if (recent7.length === 0 || older7.length === 0) {
    return { trend: 'stable', change: 0 };
  }

  const recentAvg = recent7.reduce((s, l) => s + (l.condition || 3), 0) / recent7.length;
  const olderAvg = older7.reduce((s, l) => s + (l.condition || 3), 0) / older7.length;

  // 변화량 계산 및 범위 보장
  const rawChange = Math.round((recentAvg - olderAvg) * 20);
  const change = Math.max(CHANGE_RANGE.min, Math.min(CHANGE_RANGE.max, rawChange));

  let trend = 'stable';
  if (change > TREND_THRESHOLD.CHANGE_PERCENT) trend = 'up';
  else if (change < -TREND_THRESHOLD.CHANGE_PERCENT) trend = 'down';

  return { trend, change };
}

/**
 * UHS 구성요소별 트렌드
 */
export function getComponentTrends() {
  const checkInStore = useCheckInStore.getState();
  const dreamStore = useDreamStore.getState();

  const recentCutoff = getDaysAgo(ANALYSIS_PERIOD.RECENT_DAYS);
  const olderCutoff = getDaysAgo(ANALYSIS_PERIOD.COMPARISON_DAYS);

  const recent7 = checkInStore.logs.filter(l => l.date >= recentCutoff);
  const older7 = checkInStore.logs.filter(
    l => l.date >= olderCutoff && l.date < recentCutoff
  );

  const calculateTrend = (recentData, olderData) => {
    if (recentData.length === 0 || olderData.length === 0) return 'stable';

    const recentAvg = recentData.reduce((a, b) => a + b, 0) / recentData.length;
    const olderAvg = olderData.reduce((a, b) => a + b, 0) / olderData.length;

    if (recentAvg > olderAvg * TREND_THRESHOLD.RATIO_UP) return 'up';
    if (recentAvg < olderAvg * TREND_THRESHOLD.RATIO_DOWN) return 'down';
    return 'stable';
  };

  // 수면 트렌드 (품질 기준)
  const recentSleep = recent7.filter(l => l.sleep?.quality).map(l => l.sleep.quality);
  const olderSleep = older7.filter(l => l.sleep?.quality).map(l => l.sleep.quality);
  const sleepTrend = calculateTrend(recentSleep, olderSleep);

  // 스트레스 트렌드 (역방향: 낮을수록 좋음)
  const recentStress = recent7.filter(l => l.stressLevel).map(l => 6 - l.stressLevel);
  const olderStress = older7.filter(l => l.stressLevel).map(l => 6 - l.stressLevel);
  const stressTrend = calculateTrend(recentStress, olderStress);

  // 꿈 트렌드
  const recentDreams = dreamStore.dreams.filter(d => d.date >= recentCutoff);
  const olderDreams = dreamStore.dreams.filter(
    d => d.date >= olderCutoff && d.date < recentCutoff
  );
  const dreamTrend = recentDreams.length > olderDreams.length ? 'up' :
                     recentDreams.length < olderDreams.length ? 'down' : 'stable';

  // 기분 트렌드
  const recentMood = recent7.filter(l => l.condition).map(l => l.condition);
  const olderMood = older7.filter(l => l.condition).map(l => l.condition);
  const moodTrend = calculateTrend(recentMood, olderMood);

  return {
    sleep: sleepTrend,
    stress: stressTrend,
    dream: dreamTrend,
    mood: moodTrend,
    prediction: 'stable', // 예측 정확도는 별도 계산 필요
  };
}

/**
 * UHS 면책 조항 반환
 */
export function getDisclaimer() {
  return UHS_DISCLAIMER;
}

export default {
  calculateCurrentUHS,
  getUHSDetails,
  getUHSTrend,
  getComponentTrends,
  getDisclaimer,
};
