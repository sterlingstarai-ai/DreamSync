# Fuzz / Property Testing Report

> DreamSync Release Hardening — fast-check 프로퍼티 테스트 결과

## 도구

- **fast-check** v3.x + Vitest
- 총 실행 횟수: ~1,400 random inputs across all properties

## 검증된 불변 조건

### 1. 어떤 입력에서도 crash 없이 저장/폴백

| 불변 조건 | fast-check runs | 결과 |
|----------|----------------|------|
| `safeParseSleepSummary` never throws | 200 | PASS |
| `safeParse(DreamAnalysisSchema)` never throws | 100 | PASS |
| `safeParse(ForecastPredictionSchema)` never throws | 100 | PASS |
| `calculateConfidence` never throws | 200 | PASS |
| `estimateSleepQuality` never throws | 200 | PASS |

### 2. 스코어 범위 불변

| 불변 조건 | fast-check runs | 결과 |
|----------|----------------|------|
| `calculateConfidence` ∈ [0, 100] ∩ Z | 200 | PASS |
| `calculateDataCompleteness` ∈ [0, 100] | 100 | PASS |
| `calculateSleepSignalQuality` ∈ [0, 100] | 100 | PASS |
| `calculateConsistencyScore` ∈ [0, 100] | 100 | PASS |
| `calculateModelHealth` ∈ [0, 100] | 100 | PASS |
| `estimateSleepQuality` ∈ {null} ∪ [0, 10] ∩ Z | 200 | PASS |

### 3. Feature flag off 경로 불변

| 불변 조건 | 결과 |
|----------|------|
| 모든 기본 플래그 = false (mockAI 제외) | PASS |
| 미등록 플래그 → `isFlagAvailable` = false | PASS (50 runs) |
| 모든 등록 플래그 web에서 사용 가능 | PASS |

### 4. 마이그레이션 안정성

| 불변 조건 | 결과 |
|----------|------|
| v0→current 마이그레이션 데이터 보존 | PASS |
| feature flag persist 무손실 | PASS |

### 5. 소스 우선순위 불변

| 불변 조건 | fast-check runs | 결과 |
|----------|----------------|------|
| manual 데이터가 항상 auto를 이김 | 30 | PASS |
| manual이 auto를 덮어쓸 수 있음 | 30 | PASS |
| 스토어 크기 ≤ 90 | deterministic | PASS |

### 6. 단조성 불변 (monotonicity)

| 불변 조건 | fast-check runs | 결과 |
|----------|----------------|------|
| wearable 데이터 → completeness 증가 | 50 | PASS |
| 7-9h 수면 > <5h 수면 (품질 점수) | 50 | PASS |

## 발견된 버그

없음. 모든 프로퍼티가 random input에서 통과.

## 테스트 파일

`src/lib/__tests__/hardening.property.test.js` — 30 tests
