/**
 * UHS (Unconscious Health Score) 계산 로직
 *
 * 지침서 7. UHS 구성 요소 기반
 *
 * 컴포넌트      가중치    근거
 * Sleep         35%      수면은 꿈/컨디션과 직접 상관
 * Stress        25%      체크인 기반 스트레스 2축(work/relation)
 * Dream         15%      강도/반복 상징이 높을수록 변동성 증가
 * Mood Drift    15%      감정 변동성(분산)
 * Pred Error    10%      최근 예측 오차가 높으면 UHS 신뢰도 하락
 *
 * ⚠️ 중요: UHS는 의료 진단이 아닌 '참고 지표'입니다.
 * 의료/진단/치료 문구 사용 금지
 */

/**
 * 0-100 사이로 값 제한
 */
function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * 수면 점수 계산 (0-100)
 *
 * @param {Object} params
 * @param {number} [params.duration] - 수면 시간 (분)
 * @param {number} [params.quality] - 수면 품질 (1-5, 자가 보고)
 * @param {number} [params.remPercent] - REM 비율
 * @param {number} [params.deepPercent] - 딥 수면 비율
 * @returns {number}
 */
export function calculateSleepScore({ duration, quality, remPercent, deepPercent }) {
  let score = 50; // 기본값

  // 수면 시간 (최대 40점)
  if (duration) {
    const hours = duration / 60;
    if (hours >= 7 && hours <= 8.5) score += 40;
    else if (hours >= 6 && hours < 7) score += 30;
    else if (hours > 8.5 && hours <= 9.5) score += 30;
    else if (hours >= 5 && hours < 6) score += 15;
    else score += 5;
  }

  // 자가 보고 품질 (최대 20점)
  if (quality) {
    score += (quality / 5) * 20;
  }

  // 웨어러블 데이터 보너스 (최대 20점)
  if (remPercent !== undefined && deepPercent !== undefined) {
    const remScore = remPercent >= 18 && remPercent <= 25 ? 10 : 5;
    const deepScore = deepPercent >= 13 && deepPercent <= 23 ? 10 : 5;
    score += remScore + deepScore;
  }

  return clamp(score);
}

/**
 * 스트레스 점수 계산 (0-100, 높을수록 좋음 = 낮은 스트레스)
 *
 * @param {Object} params
 * @param {number} [params.stressLevel] - 스트레스 레벨 (1-5)
 * @param {number} [params.avgStress] - 최근 7일 평균 스트레스
 * @returns {number}
 */
export function calculateStressScore({ stressLevel, avgStress }) {
  // 스트레스 1-5 를 역산 (낮은 스트레스 = 높은 점수)
  const level = avgStress || stressLevel || 3;
  const baseScore = ((5 - level) / 4) * 100;

  return clamp(baseScore);
}

/**
 * 꿈 강도 점수 계산 (0-100, 안정적일수록 높음)
 *
 * @param {Object} params
 * @param {number} [params.avgIntensity] - 평균 꿈 강도 (1-10)
 * @param {number} [params.symbolVariety] - 심볼 다양성 (고유 심볼 수)
 * @param {number} [params.dreamCount] - 최근 7일 꿈 수
 * @returns {number}
 */
export function calculateDreamScore({ avgIntensity, symbolVariety, dreamCount }) {
  let score = 50; // 기본값

  // 평균 강도 (적당한 강도가 좋음, 4-6이 이상적)
  if (avgIntensity) {
    if (avgIntensity >= 4 && avgIntensity <= 6) score += 30;
    else if (avgIntensity >= 3 && avgIntensity < 4) score += 20;
    else if (avgIntensity > 6 && avgIntensity <= 7) score += 20;
    else score += 10;
  }

  // 심볼 다양성 (너무 높으면 혼란, 적당해야 좋음)
  if (symbolVariety !== undefined) {
    if (symbolVariety >= 3 && symbolVariety <= 8) score += 15;
    else if (symbolVariety < 3) score += 10;
    else score += 5;
  }

  // 꿈 기록 빈도 (주 2-4회가 이상적)
  if (dreamCount !== undefined) {
    if (dreamCount >= 2 && dreamCount <= 4) score += 15;
    else if (dreamCount >= 1 && dreamCount < 2) score += 10;
    else if (dreamCount > 4) score += 10;
    else score += 5;
  }

  return clamp(score);
}

/**
 * 기분 변동성 점수 계산 (0-100, 안정적일수록 높음)
 *
 * @param {Object} params
 * @param {number[]} [params.conditions] - 최근 7일 컨디션 배열 (1-5)
 * @returns {number}
 */
export function calculateMoodDriftScore({ conditions = [] }) {
  if (conditions.length < 2) {
    return 50; // 데이터 부족
  }

  // 평균 계산
  const avg = conditions.reduce((sum, c) => sum + c, 0) / conditions.length;

  // 분산 계산
  const variance = conditions.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / conditions.length;
  const stdDev = Math.sqrt(variance);

  // 표준편차가 낮을수록 높은 점수 (안정적)
  // stdDev 0 = 100점, stdDev 2 이상 = 40점
  const stabilityScore = Math.max(40, 100 - stdDev * 30);

  // 평균 컨디션 보너스 (높을수록 좋음)
  const avgBonus = (avg / 5) * 20;

  return clamp(stabilityScore * 0.7 + avgBonus);
}

/**
 * 예측 오차 점수 계산 (0-100, 정확할수록 높음)
 *
 * @param {Object} params
 * @param {number} [params.avgAccuracy] - 평균 예측 정확도 (0-100)
 * @returns {number}
 */
export function calculatePredictionErrorScore({ avgAccuracy }) {
  if (avgAccuracy === undefined || avgAccuracy === null) {
    return 50; // 데이터 없음
  }
  return clamp(avgAccuracy);
}

/**
 * 전체 UHS 점수 계산
 *
 * @param {Object} params
 * @param {Object} params.sleep - 수면 파라미터
 * @param {Object} params.stress - 스트레스 파라미터
 * @param {Object} params.dream - 꿈 파라미터
 * @param {Object} params.mood - 기분 변동성 파라미터
 * @param {Object} params.prediction - 예측 오차 파라미터
 * @returns {{ score: number, breakdown: Object, confidence: string }}
 */
export function calculateUHS({ sleep, stress, dream, mood, prediction }) {
  const sleepScore = calculateSleepScore(sleep || {});
  const stressScore = calculateStressScore(stress || {});
  const dreamScore = calculateDreamScore(dream || {});
  const moodScore = calculateMoodDriftScore(mood || {});
  const predictionScore = calculatePredictionErrorScore(prediction || {});

  const score = clamp(
    0.35 * sleepScore +
    0.25 * stressScore +
    0.15 * dreamScore +
    0.15 * moodScore +
    0.10 * predictionScore
  );

  const breakdown = {
    sleep: sleepScore,
    stress: stressScore,
    dream: dreamScore,
    mood: moodScore,
    prediction: predictionScore,
  };

  // 데이터 충분성에 따른 신뢰도
  const dataPoints = [sleep, stress, dream, mood, prediction].filter(p => p && Object.keys(p).length > 0).length;
  let confidence;
  if (dataPoints >= 4) confidence = '높음';
  else if (dataPoints >= 2) confidence = '보통';
  else confidence = '낮음';

  return {
    score,
    breakdown,
    confidence,
  };
}

/**
 * UHS 레벨 텍스트 (의료 문구 금지)
 * @param {number} score
 * @returns {{ level: string, description: string }}
 */
export function getUHSLevel(score) {
  if (score >= 80) {
    return {
      level: '좋음',
      description: '전반적인 웰니스 상태가 양호해요.',
    };
  }
  if (score >= 60) {
    return {
      level: '보통',
      description: '무난한 상태입니다. 꾸준한 관리를 추천해요.',
    };
  }
  if (score >= 40) {
    return {
      level: '주의',
      description: '컨디션 관리에 조금 더 신경 써보세요.',
    };
  }
  return {
    level: '관심 필요',
    description: '충분한 휴식과 자기 돌봄이 필요한 시기예요.',
  };
}

/**
 * UHS 면책 조항 (앱 전역에서 고정 사용)
 */
export const UHS_DISCLAIMER = '이 점수는 참고 지표이며, 의료적 진단이나 조언이 아닙니다.';

export default {
  calculateUHS,
  calculateSleepScore,
  calculateStressScore,
  calculateDreamScore,
  calculateMoodDriftScore,
  calculatePredictionErrorScore,
  getUHSLevel,
  UHS_DISCLAIMER,
};
