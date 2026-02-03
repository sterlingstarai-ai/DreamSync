/**
 * Forecast Service
 *
 * 예보 생성, 정확도 기록, 조회를 담당하는 서비스 레이어
 */

import { generateId } from '../utils/id';
import { getTodayString, getDaysAgo } from '../utils/date';
import { calculateConfidence } from '../scoring';
import { getAIAdapter } from '../adapters';
import useForecastStore from '../../store/useForecastStore';
import useDreamStore from '../../store/useDreamStore';
import useCheckInStore from '../../store/useCheckInStore';

/**
 * 오늘 예보 생성
 */
export async function generateTodayForecast() {
  const store = useForecastStore.getState();
  const today = getTodayString();

  // 이미 오늘 예보가 있으면 반환
  const existing = store.forecasts.find(f => f.date === today);
  if (existing) return existing;

  // 데이터 수집
  const data = collectForecastData();

  // Confidence 계산
  const confidence = calculateConfidence({
    data: {
      dreamCount: data.recentDreams.length,
      checkInCount: data.recentCheckIns.length,
      hasWearableData: false, // Phase 2에서 활성화
    },
    sleep: {
      isManualInput: true,
      sleepDuration: data.avgSleepDuration,
    },
    consistency: {
      accuracyHistory: data.recentAccuracies,
    },
    model: {},
  });

  try {
    // AI 예보 생성
    const aiAdapter = getAIAdapter();
    const prediction = await aiAdapter.generateForecast(data);

    const forecast = {
      id: generateId(),
      date: today,
      prediction: {
        ...prediction,
        confidence,
      },
      inputData: {
        dreamCount: data.recentDreams.length,
        checkInCount: data.recentCheckIns.length,
        avgCondition: data.avgCondition,
        avgStress: data.avgStress,
      },
      actual: null,
      accuracy: null,
      createdAt: new Date().toISOString(),
    };

    store.addForecast(forecast);
    return forecast;
  } catch (error) {
    console.error('[ForecastService] Generation failed:', error);

    // 폴백 예보
    const fallbackForecast = {
      id: generateId(),
      date: today,
      prediction: {
        condition: 3,
        confidence,
        summary: '데이터가 부족하여 예측이 어렵습니다. 체크인을 꾸준히 해주세요.',
        risks: [],
        suggestions: ['꿈 기록하기', '저녁 체크인하기'],
      },
      inputData: {},
      actual: null,
      accuracy: null,
      createdAt: new Date().toISOString(),
      error: error.message,
    };

    store.addForecast(fallbackForecast);
    return fallbackForecast;
  }
}

/**
 * 예보 데이터 수집
 */
function collectForecastData() {
  const dreamStore = useDreamStore.getState();
  const checkInStore = useCheckInStore.getState();
  const forecastStore = useForecastStore.getState();

  const cutoff = getDaysAgo(7);

  // 최근 7일 꿈
  const recentDreams = dreamStore.dreams.filter(d => d.date >= cutoff);

  // 최근 7일 체크인
  const recentCheckIns = checkInStore.logs.filter(l => l.date >= cutoff);

  // 평균 컨디션
  const conditions = recentCheckIns
    .filter(c => c.condition)
    .map(c => c.condition);
  const avgCondition = conditions.length > 0
    ? conditions.reduce((a, b) => a + b, 0) / conditions.length
    : 3;

  // 평균 스트레스
  const stresses = recentCheckIns
    .filter(c => c.stressLevel)
    .map(c => c.stressLevel);
  const avgStress = stresses.length > 0
    ? stresses.reduce((a, b) => a + b, 0) / stresses.length
    : 3;

  // 평균 수면 시간
  const sleepDurations = recentCheckIns
    .filter(c => c.sleep?.duration)
    .map(c => c.sleep.duration);
  const avgSleepDuration = sleepDurations.length > 0
    ? sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length
    : 420;

  // 최근 예보 정확도
  const recentForecasts = forecastStore.forecasts
    .filter(f => f.accuracy !== null)
    .slice(0, 14);
  const recentAccuracies = recentForecasts.map(f => f.accuracy);

  // 꿈 분석 요약
  const dreamSymbols = [];
  const dreamEmotions = [];
  for (const dream of recentDreams) {
    if (dream.analysis?.symbols) {
      dreamSymbols.push(...dream.analysis.symbols.map(s => s.name));
    }
    if (dream.analysis?.emotions) {
      dreamEmotions.push(...dream.analysis.emotions.map(e => e.type));
    }
  }

  return {
    recentDreams,
    recentCheckIns,
    avgCondition,
    avgStress,
    avgSleepDuration,
    recentAccuracies,
    dreamSymbols: [...new Set(dreamSymbols)],
    dreamEmotions: [...new Set(dreamEmotions)],
  };
}

/**
 * 실제 값 기록 (체크인에서 호출)
 */
export function recordActual(actualCondition) {
  const store = useForecastStore.getState();
  const today = getTodayString();

  const todayForecast = store.forecasts.find(f => f.date === today);
  if (!todayForecast) return;

  // 정확도 계산 (예측과 실제의 차이)
  const predictedCondition = todayForecast.prediction?.condition || 3;
  const diff = Math.abs(predictedCondition - actualCondition);
  const accuracy = Math.round((1 - diff / 4) * 100); // 0-100%

  store.updateForecast(todayForecast.id, {
    actual: actualCondition,
    accuracy,
    recordedAt: new Date().toISOString(),
  });
}

/**
 * 오늘 예보 조회
 */
export function getTodayForecast() {
  const store = useForecastStore.getState();
  const today = getTodayString();
  return store.forecasts.find(f => f.date === today);
}

/**
 * 예보 정확도 통계
 */
export function getForecastStats(days = 14) {
  const store = useForecastStore.getState();
  const cutoff = getDaysAgo(days);

  const recentForecasts = store.forecasts.filter(
    f => f.date >= cutoff && f.accuracy !== null
  );

  if (recentForecasts.length === 0) {
    return {
      count: 0,
      avgAccuracy: 0,
      trend: 'stable',
    };
  }

  const avgAccuracy = Math.round(
    recentForecasts.reduce((sum, f) => sum + f.accuracy, 0) / recentForecasts.length
  );

  // 트렌드 계산 (최근 7일 vs 이전 7일)
  const recent7 = recentForecasts.filter(f => f.date >= getDaysAgo(7));
  const older7 = recentForecasts.filter(f => f.date < getDaysAgo(7));

  let trend = 'stable';
  if (recent7.length > 0 && older7.length > 0) {
    const recentAvg = recent7.reduce((s, f) => s + f.accuracy, 0) / recent7.length;
    const olderAvg = older7.reduce((s, f) => s + f.accuracy, 0) / older7.length;

    if (recentAvg > olderAvg + 5) trend = 'up';
    else if (recentAvg < olderAvg - 5) trend = 'down';
  }

  return {
    count: recentForecasts.length,
    avgAccuracy,
    trend,
  };
}

/**
 * 데이터 내보내기 (JSON)
 */
export function exportForecasts() {
  const store = useForecastStore.getState();
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    forecasts: store.forecasts,
  };
}

export default {
  generateTodayForecast,
  recordActual,
  getTodayForecast,
  getForecastStats,
  exportForecasts,
};
