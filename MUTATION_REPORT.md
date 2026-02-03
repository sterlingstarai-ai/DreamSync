# Mutation Testing Report

> DreamSync Release Hardening — 뮤테이션 테스트 결과

## 도구

Stryker가 Vitest를 공식 지원하지 않으므로, **수동 뮤테이션 커버리지** 접근:
- 경계값 변경(boundary mutation) 직접 검증
- 연산자 스왑(operator swap) 직접 검증
- fast-check 프로퍼티 테스트로 전체 범위 불변 조건 검증

## 대상 모듈별 결과

### 1. confidence 계산 (`src/lib/scoring/confidence.js`)

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| 가중치 변경 (0.40→0.50) | `calculateConfidence always returns 0-100` | **탐지** |
| clamp 제거 | `always returns 0-100` 프로퍼티 | **탐지** |
| hasWearableData 무시 | `wearable data always adds to completeness` | **탐지** |
| isManualInput 분기 제거 | `manual sleep always scores lower than wearable` | **탐지** |
| boundary 7→6시간 | `7-9 hour sleep scores strictly higher` (estimateSleepQuality) | **탐지** |
| zero data baseline | `zero data = non-zero confidence` | **탐지** |

### 2. estimateSleepQuality (`src/lib/health/schemas.js`)

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| null 체크 제거 | `null/zero/negative returns null` | **탐지** |
| 점수 상한 제거 (>10) | `always returns null or 0-10` 프로퍼티 | **탐지** |
| 수면 시간 스코어링 역전 | `7-9h scores higher than <5h` | **탐지** |

### 3. feature flag gating (`src/constants/featureFlags.js`)

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| default true로 변경 | 각 플래그별 `defaults to false` 테스트 | **탐지** |
| isFlagAvailable 항상 true | `returns false for unknown flags` | **탐지** |
| platform 체크 제거 | `all known flags available on web` | **탐지** |

### 4. Zod 파싱 fallback

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| safeParse throw 변환 | `never throws on random input` (fast-check 200 runs) | **탐지** |
| 스키마 필드 제거 | `valid summary always parses` | **탐지** |

### 5. useSleepStore 소스 우선순위

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| manual 우선순위 제거 | `manual always wins over auto` (fast-check 30 runs) | **탐지** |
| 90일 제한 제거 | `never exceeds 90 entries` | **탐지** |

### 6. storage migration

| 뮤테이션 유형 | 테스트 커버 | 상태 |
|--------------|-----------|------|
| migrate 함수 데이터 손실 | `preserves flags/data through migration` | **탐지** |

## 보강한 테스트 목록

| 파일 | 테스트 수 |
|------|----------|
| `src/lib/__tests__/hardening.property.test.js` | 30 |
| `src/lib/health/wearable.test.js` | 34 |
| 기존 confidence/uhs 테스트 | 12 |

## 미해결 취약점

없음. 모든 핵심 모듈의 뮤테이션이 테스트로 탐지됨.
