/**
 * Wearable Sleep Summary — Zod 스키마 + JSDoc 타입
 *
 * 플랫폼별 원시 데이터를 이 모델로 정규화한다.
 * 원시 샘플/레코드는 저장하지 않고, 요약(summary)만 저장.
 */
import { z } from 'zod';

/**
 * 수면 데이터 소스
 */
export const SleepSourceEnum = z.enum(['manual', 'healthkit', 'healthconnect']);

/**
 * WearableSleepSummary 스키마
 *
 * @description
 * - date: 사용자 로컬 기준 YYYY-MM-DD
 * - totalSleepMinutes: 총 수면 시간 (분)
 * - sleepQualityScore: 0~10 추정값 (null이면 산출 불가)
 * - remMinutes/deepMinutes: 수면 단계별 분 (null이면 미제공)
 * - hrvMs: 심박변이도 ms (null이면 미제공)
 * - source: 데이터 출처
 * - fetchedAt: ISO 8601 타임스탬프
 */
export const WearableSleepSummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSleepMinutes: z.number().min(0).nullable(),
  sleepQualityScore: z.number().min(0).max(10).nullable(),
  remMinutes: z.number().min(0).nullable(),
  deepMinutes: z.number().min(0).nullable(),
  hrvMs: z.number().min(0).nullable(),
  bedTime: z.string().nullable().optional(),
  wakeTime: z.string().nullable().optional(),
  source: SleepSourceEnum,
  fetchedAt: z.string(),
});

/**
 * @typedef {z.infer<typeof WearableSleepSummarySchema>} WearableSleepSummary
 */

/**
 * 웨어러블 연결 상태
 */
export const WearableStatusSchema = z.object({
  connected: z.boolean(),
  platform: z.enum(['healthkit', 'healthconnect', 'web', 'none']),
  lastSync: z.string().nullable(),
  permissions: z.array(z.string()),
  error: z.string().nullable().optional(),
});

/**
 * @typedef {z.infer<typeof WearableStatusSchema>} WearableStatus
 */

/**
 * WearableSleepSummary를 안전하게 파싱
 * @param {unknown} data
 * @returns {{ success: boolean, data?: WearableSleepSummary, error?: z.ZodError }}
 */
export function safeParseSleepSummary(data) {
  return WearableSleepSummarySchema.safeParse(data);
}

/**
 * 수면 품질 점수 추정 (0~10)
 *
 * totalSleepMinutes 기반 간이 산출.
 * REM/Deep 비율이 있으면 가산.
 *
 * @param {Object} params
 * @param {number|null} params.totalSleepMinutes
 * @param {number|null} [params.remMinutes]
 * @param {number|null} [params.deepMinutes]
 * @param {number|null} [params.hrvMs]
 * @returns {number|null} 0~10 또는 null
 */
export function estimateSleepQuality({ totalSleepMinutes, remMinutes, deepMinutes, hrvMs }) {
  if (totalSleepMinutes == null || totalSleepMinutes <= 0) return null;

  let score = 0;
  const hours = totalSleepMinutes / 60;

  // 수면 시간 (최대 4점): 7~9시간이 최적
  if (hours >= 7 && hours <= 9) score += 4;
  else if (hours >= 6 && hours < 7) score += 3;
  else if (hours > 9 && hours <= 10) score += 3;
  else if (hours >= 5) score += 2;
  else score += 1;

  // REM 비율 (최대 2점): 적정 20~25%
  if (remMinutes != null && totalSleepMinutes > 0) {
    const remPercent = (remMinutes / totalSleepMinutes) * 100;
    if (remPercent >= 18 && remPercent <= 28) score += 2;
    else if (remPercent >= 15) score += 1;
  } else {
    score += 1; // 데이터 없으면 중간값
  }

  // Deep sleep 비율 (최대 2점): 적정 15~20%
  if (deepMinutes != null && totalSleepMinutes > 0) {
    const deepPercent = (deepMinutes / totalSleepMinutes) * 100;
    if (deepPercent >= 13 && deepPercent <= 23) score += 2;
    else if (deepPercent >= 10) score += 1;
  } else {
    score += 1;
  }

  // HRV (최대 2점): 높을수록 좋음
  if (hrvMs != null) {
    if (hrvMs >= 50) score += 2;
    else if (hrvMs >= 30) score += 1;
  } else {
    score += 1;
  }

  return Math.min(10, Math.max(0, score));
}
