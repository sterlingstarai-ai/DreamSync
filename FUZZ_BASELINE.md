# Fuzz Baseline

> DreamSync Release Hardening — 프로퍼티/퍼징 테스트 베이스라인 (2026-02-04)

## 도구

- **fast-check** v4.x + Vitest
- 총 실행 횟수: ~1,400+ random inputs across all properties

## 프로퍼티 목록

### 1. Crash-free 불변

| 프로퍼티 | runs | 결과 | 크래시 |
|----------|------|------|--------|
| `safeParseSleepSummary` never throws | 200 | PASS | 0 |
| `safeParse(DreamAnalysisSchema)` never throws | 100 | PASS | 0 |
| `safeParse(ForecastPredictionSchema)` never throws | 100 | PASS | 0 |
| `calculateConfidence` never throws | 200 | PASS | 0 |
| `estimateSleepQuality` never throws | 200 | PASS | 0 |

### 2. 범위 불변

| 프로퍼티 | runs | 결과 | 위반 |
|----------|------|------|------|
| `calculateConfidence` ∈ [0, 100] | 200 | PASS | 0 |
| `calculateDataCompleteness` ∈ [0, 100] | 100 | PASS | 0 |
| `calculateSleepSignalQuality` ∈ [0, 100] | 100 | PASS | 0 |
| `calculateConsistencyScore` ∈ [0, 100] | 100 | PASS | 0 |
| `calculateModelHealth` ∈ [0, 100] | 100 | PASS | 0 |
| `estimateSleepQuality` ∈ {null} ∪ [0, 10] | 200 | PASS | 0 |

### 3. Feature flag off 불변

| 프로퍼티 | runs | 결과 |
|----------|------|------|
| 모든 기본 플래그 = false (mockAI 제외) | 1 | PASS |
| 미등록 플래그 → `isFlagAvailable` = false | 50 | PASS |
| 모든 등록 플래그 web에서 사용 가능 | 1 | PASS |

### 4. 소스 우선순위

| 프로퍼티 | runs | 결과 |
|----------|------|------|
| manual 데이터가 항상 auto를 이김 | 30 | PASS |
| manual이 auto를 덮어쓸 수 있음 | 30 | PASS |
| 스토어 크기 ≤ 90 | det. | PASS |

### 5. 단조성

| 프로퍼티 | runs | 결과 |
|----------|------|------|
| wearable 데이터 → completeness 증가 | 50 | PASS |
| 7-9h 수면 > <5h 수면 | 50 | PASS |

## 발견 및 수정된 이슈

| # | 이슈 | 원인 | 수정 |
|---|------|------|------|
| 1 | `fc.date()` → `Date(NaN)` → `toISOString()` RangeError | fast-check 시드에 따라 NaN date 생성 | `isNaN(date.getTime())` guard 추가 |

## 요약

- **크래시: 0** (NaN date 이슈 수정 완료)
- **범위 위반: 0**
- **flag off 위반: 0**
- **추가 작업: 없음**
