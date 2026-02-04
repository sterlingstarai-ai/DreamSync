# Mutation Baseline

> DreamSync Release Hardening — 뮤테이션 테스트 베이스라인 (2026-02-04)

## 도구

Stryker가 Vitest를 공식 지원하지 않으므로, 수동 뮤테이션 + fast-check 프로퍼티 기반 커버리지.

## 대상 모듈

### 1. confidence.js (스코어링 핵심)

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| 가중치 0.40→0.50 | 🔴 killed | `calculateConfidence always returns 0-100` |
| clamp 제거 | 🔴 killed | 범위 프로퍼티 (200 runs) |
| hasWearableData 무시 | 🔴 killed | `wearable data always adds to completeness` |
| isManualInput 분기 제거 | 🔴 killed | `manual sleep always scores lower` |
| boundary 7→6시간 | 🔴 killed | estimateSleepQuality 경계값 |
| zero data baseline | 🔴 killed | `zero data = non-zero confidence` |
| **survivors: 0/6** |

### 2. featureFlags.js (플래그 게이팅)

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| default true로 변경 | 🔴 killed | 6개 플래그별 `defaults to false` |
| isFlagAvailable 항상 true | 🔴 killed | `returns false for unknown flags` |
| platform 체크 제거 | 🔴 killed | `all known flags available on web` |
| **survivors: 0/3** |

### 3. schemas.js (Zod 파싱 fallback)

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| safeParse throw 변환 | 🔴 killed | `never throws on random input` (200 runs) |
| 스키마 필드 제거 | 🔴 killed | `valid summary always parses` |
| **survivors: 0/2** |

### 4. useSleepStore (소스 우선순위)

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| manual 우선순위 제거 | 🔴 killed | `manual always wins over auto` (30 runs) |
| 90일 제한 제거 | 🔴 killed | `never exceeds 90 entries` |
| **survivors: 0/2** |

### 5. estimateSleepQuality (건강 점수)

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| null 체크 제거 | 🔴 killed | `null/zero/negative returns null` |
| 점수 상한 제거 | 🔴 killed | `always returns null or 0-10` |
| 수면 시간 역전 | 🔴 killed | `7-9h scores higher than <5h` |
| **survivors: 0/3** |

### 6. storage migration

| 뮤테이션 | 생존 여부 | 탐지 테스트 |
|----------|-----------|------------|
| migrate 데이터 손실 | 🔴 killed | `preserves flags/data through migration` |
| **survivors: 0/1** |

## 요약

| 모듈 | mutants | killed | survivors | kill rate |
|------|---------|--------|-----------|-----------|
| confidence.js | 6 | 6 | 0 | 100% |
| featureFlags.js | 3 | 3 | 0 | 100% |
| schemas.js | 2 | 2 | 0 | 100% |
| useSleepStore | 2 | 2 | 0 | 100% |
| estimateSleepQuality | 3 | 3 | 0 | 100% |
| storage migration | 1 | 1 | 0 | 100% |
| **합계** | **17** | **17** | **0** | **100%** |

**Survivors: 0. 추가 작업 불필요.**
