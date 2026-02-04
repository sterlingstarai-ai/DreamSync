# Hardening Progress Log

> DreamSync Release Hardening — 결함 수정 이력

## 수정 기록

### #1: fc.date() NaN → toISOString() RangeError

| 항목 | 내용 |
|------|------|
| **원인** | `fc.date()` 가 특정 seed에서 `Date(NaN)` 생성. `toISOString()` 호출 시 `RangeError: Invalid time value` |
| **발견** | `npm run verify` 전체 실행 시 간헐 실패 (seed 의존) |
| **수정** | `isNaN(date.getTime())` guard 추가 — NaN date는 skip |
| **테스트** | `valid WearableSleepSummary always parses successfully` — 50 runs |
| **재발방지** | fast-check date arbitrary 사용 시 항상 NaN guard 포함 |
| **파일** | `src/lib/__tests__/hardening.property.test.js:325` |

### #2: initSyncQueue 복원 후 flush 누락

| 항목 | 내용 |
|------|------|
| **원인** | `initSyncQueue()` 가 storage에서 큐를 로드하지만 온라인일 때 flush 호출 없음 |
| **발견** | CI 환경에서 `syncQueue.test.js:80` 실패 (`expected 2 to be +0`) |
| **수정** | `initSyncQueue` 에서 로드 후 `state.isOnline && state.items.length > 0` 이면 `flush()` 호출 |
| **테스트** | `initSyncQueue는 저장된 큐를 복원한다` — 기존 테스트가 이제 일관 통과 |
| **재발방지** | 3x repeat (`npm run test:repeat`) + CI flaky guard |
| **파일** | `src/lib/offline/syncQueue.js:31-34` |

### #3: Flag-off smoke test 추가

| 항목 | 내용 |
|------|------|
| **원인** | flag off 시 gated 경로 미실행을 검증하는 자동 테스트 부재 |
| **수정** | 3개 테스트 추가: DEFAULT_FLAGS/DEFAULT_FEATURE_FLAGS 이중 검증, 6개 플래그 전수, 플랫폼 가용성 |
| **테스트** | `Flag-off smoke test` describe (3 tests) |
| **파일** | `src/lib/__tests__/hardening.property.test.js` |

### #4: PII leak regression test 추가

| 항목 | 내용 |
|------|------|
| **원인** | maskDreamContent/maskSensitiveFields의 정확성을 자동 검증하는 테스트 부재 |
| **수정** | 3개 테스트 추가: maskDreamContent 100 random runs, maskSensitiveFields 13키 strip, 핵심 PII 키 커버리지 |
| **테스트** | `PII leak regression` describe (3 tests) |
| **파일** | `src/lib/__tests__/hardening.property.test.js` |

## 현재 지표

| 지표 | 값 |
|------|-----|
| Tests | 240 (23 files) |
| Lint errors | 0 |
| Mutation survivors | 0/17 |
| Fuzz crashes | 0 |
| Flag-off violations | 0 |
| PII leak patterns | 0 |
| Bundle secrets | 0 |
| Repeat flakes (3x) | 0 |

## 문서 산출물

| 문서 | 용도 |
|------|------|
| HARDENING_STATUS.md | 1-page 현황 요약 |
| HARDENING_GATE.md | 릴리스 게이트 체크리스트 |
| HARDENING_PROGRESS.md | 결함 수정 이력 (이 파일) |
| HARDENING_EFFORT_MODEL.md | 작업량 산정 모델 |
| MUTATION_BASELINE.md | Mutation 테스트 베이스라인 |
| FUZZ_BASELINE.md | 퍼징 테스트 베이스라인 |
| E2E_BASELINE.md | E2E 테스트 베이스라인 |
| MONKEY_PLAN.md | 몽키 테스트 계획 |
| TESTPLAN_DEVICE_MATRIX.md | 디바이스 테스트 매트릭스 |
| TESTRUN_LOG_TEMPLATE.md | 테스트 실행 로그 템플릿 |
| scripts/release-gate.sh | 자동화된 릴리스 게이트 스크립트 |
