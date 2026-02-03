/**
 * Confidence (신뢰도) 계산 로직
 *
 * 예측의 신뢰도를 0-100 사이 값으로 산출
 * 지침서 6.2 산식 기반
 *
 * confidence = clamp(0, 100,
 *   0.40 * dataCompleteness +
 *   0.35 * sleepSignalQuality +
 *   0.15 * consistencyScore +
 *   0.10 * modelHealth
 * )
 */

/**
 * 0-100 사이로 값 제한
 * @param {number} value
 * @returns {number}
 */
function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * 데이터 완성도 계산 (0-100)
 * 꿈/체크인/웨어러블 입력 여부
 *
 * @param {Object} params
 * @param {number} params.dreamCount - 최근 7일 꿈 기록 수
 * @param {number} params.checkInCount - 최근 7일 체크인 수
 * @param {boolean} params.hasWearableData - 웨어러블 데이터 유무
 * @returns {number}
 */
export function calculateDataCompleteness({ dreamCount, checkInCount, hasWearableData }) {
  // 꿈: 최대 30점 (7일 중 3일 이상 기록 시 만점)
  const dreamScore = Math.min(30, (dreamCount / 3) * 30);

  // 체크인: 최대 50점 (7일 중 5일 이상 기록 시 만점)
  const checkInScore = Math.min(50, (checkInCount / 5) * 50);

  // 웨어러블: 20점 (있으면 만점)
  const wearableScore = hasWearableData ? 20 : 0;

  return clamp(dreamScore + checkInScore + wearableScore);
}

/**
 * 수면 신호 품질 계산 (0-100)
 *
 * @param {Object} params
 * @param {number} [params.sleepDuration] - 수면 시간 (분)
 * @param {number} [params.remPercent] - REM 수면 비율 (0-100)
 * @param {number} [params.deepPercent] - 딥 수면 비율 (0-100)
 * @param {number} [params.hrv] - HRV 값 (선택)
 * @param {boolean} params.isManualInput - 수동 입력 여부
 * @returns {number}
 */
export function calculateSleepSignalQuality({
  sleepDuration,
  remPercent,
  deepPercent,
  hrv,
  isManualInput = true,
}) {
  // 수동 입력은 기본 점수만 부여
  if (isManualInput) {
    if (!sleepDuration) return 20; // 입력 없음
    // 수면 시간만으로 간단 평가
    const hours = sleepDuration / 60;
    if (hours >= 7 && hours <= 9) return 60;
    if (hours >= 6 && hours < 7) return 50;
    if (hours > 9 && hours <= 10) return 50;
    return 30;
  }

  // 웨어러블 데이터 기반 평가
  let score = 0;

  // 수면 시간 (40점)
  if (sleepDuration) {
    const hours = sleepDuration / 60;
    if (hours >= 7 && hours <= 9) score += 40;
    else if (hours >= 6 && hours < 7) score += 30;
    else if (hours > 9 && hours <= 10) score += 30;
    else score += 15;
  }

  // REM 비율 (20점) - 적정 20-25%
  if (remPercent !== undefined) {
    if (remPercent >= 18 && remPercent <= 28) score += 20;
    else if (remPercent >= 15 && remPercent < 18) score += 15;
    else score += 10;
  } else {
    score += 10; // 데이터 없음 기본값
  }

  // 딥 수면 비율 (20점) - 적정 15-20%
  if (deepPercent !== undefined) {
    if (deepPercent >= 13 && deepPercent <= 23) score += 20;
    else if (deepPercent >= 10 && deepPercent < 13) score += 15;
    else score += 10;
  } else {
    score += 10;
  }

  // HRV (20점) - 높을수록 좋음 (개인차 있음)
  if (hrv !== undefined) {
    if (hrv >= 50) score += 20;
    else if (hrv >= 30) score += 15;
    else score += 10;
  } else {
    score += 10;
  }

  return clamp(score);
}

/**
 * 일관성 점수 계산 (0-100)
 * 지난 14일 예측 오차 기반
 *
 * @param {Object} params
 * @param {number[]} params.accuracyHistory - 최근 예측 정확도 배열 (0-100)
 * @returns {number}
 */
export function calculateConsistencyScore({ accuracyHistory = [] }) {
  if (accuracyHistory.length === 0) {
    return 50; // 기본값 (데이터 없음)
  }

  // 평균 정확도를 일관성 점수로 사용
  const avg = accuracyHistory.reduce((sum, acc) => sum + acc, 0) / accuracyHistory.length;

  // 분산이 낮을수록 보너스 (최대 10점)
  const variance = accuracyHistory.reduce((sum, acc) => sum + Math.pow(acc - avg, 2), 0) / accuracyHistory.length;
  const stdDev = Math.sqrt(variance);
  const consistencyBonus = Math.max(0, 10 - stdDev / 2);

  return clamp(avg + consistencyBonus);
}

/**
 * 모델 건강도 계산 (0-100)
 * AI 파싱 실패율/재시도율 기반
 *
 * @param {Object} params
 * @param {number} params.totalRequests - 총 요청 수
 * @param {number} params.failedRequests - 실패 요청 수
 * @param {number} params.retryRequests - 재시도 요청 수
 * @returns {number}
 */
export function calculateModelHealth({ totalRequests = 0, failedRequests = 0, retryRequests = 0 }) {
  if (totalRequests === 0) {
    return 80; // 기본값 (Mock AI 사용 시)
  }

  const failRate = failedRequests / totalRequests;
  const retryRate = retryRequests / totalRequests;

  // 실패율 0% = 100점, 10% 이상 = 50점
  const failScore = Math.max(50, 100 - failRate * 500);

  // 재시도율 0% = 100점, 20% 이상 = 60점
  const retryScore = Math.max(60, 100 - retryRate * 200);

  return clamp((failScore + retryScore) / 2);
}

/**
 * 전체 Confidence 점수 계산
 *
 * @param {Object} params
 * @param {Object} params.data - 데이터 완성도 파라미터
 * @param {Object} params.sleep - 수면 신호 파라미터
 * @param {Object} params.consistency - 일관성 파라미터
 * @param {Object} params.model - 모델 건강도 파라미터
 * @returns {number} 0-100
 */
export function calculateConfidence({ data, sleep, consistency, model }) {
  const dataCompleteness = calculateDataCompleteness(data || { dreamCount: 0, checkInCount: 0, hasWearableData: false });
  const sleepSignalQuality = calculateSleepSignalQuality(sleep || { isManualInput: true });
  const consistencyScore = calculateConsistencyScore(consistency || {});
  const modelHealth = calculateModelHealth(model || {});

  const confidence = (
    0.40 * dataCompleteness +
    0.35 * sleepSignalQuality +
    0.15 * consistencyScore +
    0.10 * modelHealth
  );

  return clamp(confidence);
}

/**
 * Confidence 레벨 텍스트
 * @param {number} confidence
 * @returns {{ level: string, description: string }}
 */
export function getConfidenceLevel(confidence) {
  if (confidence >= 80) {
    return {
      level: '높음',
      description: '충분한 데이터로 신뢰할 수 있는 예측입니다.',
    };
  }
  if (confidence >= 60) {
    return {
      level: '보통',
      description: '적절한 수준의 예측입니다.',
    };
  }
  if (confidence >= 40) {
    return {
      level: '낮음',
      description: '더 많은 데이터가 필요합니다.',
    };
  }
  return {
    level: '매우 낮음',
    description: '참고용으로만 활용하세요.',
  };
}

export default {
  calculateConfidence,
  calculateDataCompleteness,
  calculateSleepSignalQuality,
  calculateConsistencyScore,
  calculateModelHealth,
  getConfidenceLevel,
};
