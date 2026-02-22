# E2E Baseline

> DreamSync Release Hardening — E2E 테스트 베이스라인 (2026-02-04)

## 환경

- **도구**: Vitest + jsdom (컴포넌트 스모크) + Playwright (미설치, Phase 2 예정)
- **Deno**: Edge Function 테스트 (npm verify 외)

## 현재 E2E 커버리지

### 컴포넌트 스모크 테스트 (Vitest + jsdom)

| 페이지 | 테스트 수 | 커버 항목 |
|--------|-----------|----------|
| Login | 4 | 렌더링, 게스트 로그인, 빈 폼 검증 |
| Signup | 5 | 렌더링, 비밀번호 길이/불일치 검증 |
| Dashboard | 4 | 인사말, 퀵액션, 통계, 예보 플레이스홀더 |
| CheckIn | 4 | 단계 렌더링, 진행 표시, 단계 네비게이션 |
| DreamCapture | 4 | 입력 폼, 저장 버튼, 빈 상태 |

### 통합 테스트

| 모듈 | 테스트 수 | 커버 항목 |
|------|-----------|----------|
| syncQueue | 4 | enqueue→flush, subscriber, initSyncQueue 복원, clearQueue |
| Edge adapter | 6 | 정상/429/실패/fallback 초과/forecast/URL 미설정 |

### Edge Function (Deno, npm verify 외)

| 모듈 | 테스트 수 |
|------|-----------|
| rate-limit | 5 |
| audit-log | 4 |

## 반복 실행 결과

| 반복 횟수 | 결과 | flake rate |
|-----------|------|------------|
| 3x (`npm run test:repeat`) | 240×3 = 0 failures | 0% |
| 3x (final gate) | 240×3 = 0 failures | 0% |

## 미커버 시나리오

| 시나리오 | 현재 상태 | 계획 |
|----------|-----------|------|
| 전체 플로우 (Login→Dashboard→Dream→CheckIn) | 수동 검증 완료 | Playwright Phase 2 |
| 오프라인→온라인 전환 | syncQueue unit 테스트 | Playwright offline mode |
| 권한 거부 폴백 | MockProvider 테스트 | Appium/Detox Phase 3 |
| 백그라운드→복귀 | 미커버 | Manual + Capacitor |

## 요약

- **flake rate: 0%** (3x repeat 기준)
- **커버된 시나리오: 5 페이지 스모크 + 2 통합**
- **미커버: 전체 플로우 E2E, 오프라인, 권한, 백그라운드**
