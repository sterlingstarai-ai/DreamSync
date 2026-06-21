/**
 * 대시보드 '오늘의 인사이트' 단일 우선순위 슬롯 선택 로직 (순수 함수).
 *
 * 기존에 코치 플랜·목표 복구·예보 검증·다음 단계 카드가 동시에 누적되던 것을
 * 가장 시급한 1건만 노출하도록 통합한다. 활성/고급 사용자에게 보여줄 인사이트가
 * 없으면 'none'을 반환해 슬롯 자체를 비워 퀵 액션과의 중복을 막는다.
 *
 * 우선순위: 어제 예보 검증 > 주간 목표 복구 > 코치 플랜 > (초보) 다음 단계 가이드.
 *
 * @param {{
 *   canShowReview?: boolean,
 *   canShowGoalRecovery?: boolean,
 *   canShowCoachPlan?: boolean,
 *   isBeginner?: boolean,
 * }} [flags]
 * @returns {'review'|'goalRecovery'|'coachPlan'|'nextStep'|'none'}
 */
export function selectPrimaryInsight({
  canShowReview,
  canShowGoalRecovery,
  canShowCoachPlan,
  isBeginner,
} = {}) {
  if (canShowReview) return 'review';
  if (canShowGoalRecovery) return 'goalRecovery';
  if (canShowCoachPlan) return 'coachPlan';
  if (isBeginner) return 'nextStep';
  return 'none';
}

export default selectPrimaryInsight;
