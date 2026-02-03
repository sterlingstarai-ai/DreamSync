/**
 * Wearable Provider 인터페이스 (JSDoc)
 *
 * 모든 플랫폼별 provider는 이 인터페이스를 구현한다.
 * - MockProvider: 개발/테스트용
 * - HealthKitProvider: iOS (Phase 2)
 * - HealthConnectProvider: Android (Phase 2)
 *
 * @typedef {Object} IWearableProvider
 * @property {string} name - provider 식별자 ('mock' | 'healthkit' | 'healthconnect')
 * @property {() => Promise<WearableStatus>} getStatus - 연결 상태 조회
 * @property {() => Promise<{ granted: boolean, reason?: string }>} requestPermissions - 권한 요청
 * @property {() => Promise<void>} disconnect - 연결 해제
 * @property {(startDate: string, endDate: string) => Promise<import('./schemas').WearableSleepSummary[]>} getSleepSummaries - 기간별 수면 요약 조회
 * @property {(date: string) => Promise<import('./schemas').WearableSleepSummary | null>} getSleepSummary - 특정 날짜 수면 요약 조회
 */

/**
 * @typedef {import('./schemas').WearableStatus} WearableStatus
 */

// 이 파일은 타입 정의만 포함. 실제 구현은 각 provider 파일에서.
export {};
