# Hardening Status

> DreamSync Release Hardening — 현재 상태 요약 (2026-02-04)

## 프로젝트 현황

| 항목 | 상태 |
|------|------|
| React 19 + Vite 7 + Capacitor 8 | 프로덕션 빌드 통과 |
| 배포 | https://dreamsync-app.vercel.app |
| 테스트 | 23 files, 240 tests, 0 failures |
| Lint | 0 errors, 25 warnings |
| CI | GitHub Actions (lint → typecheck → build → test → flaky guard 3x) |

## 웨어러블 구현 상태

| 컴포넌트 | 상태 | 플래그 |
|----------|------|--------|
| IWearableProvider 인터페이스 | ✅ 구현 | - |
| MockWearableProvider | ✅ 구현 (날짜 기반 시드) | - |
| HealthKitProvider (iOS) | 스켈레톤 | `healthkit: false` |
| HealthConnectProvider (Android) | 스켈레톤 | `healthkit: false` |
| Provider Registry | ✅ 플랫폼별 자동 선택 | - |
| useSleepStore | ✅ Zustand persist, 90일 캡, 소스 우선순위 | - |
| CheckIn SleepStep | ✅ healthkit 플래그 on 시 표시 | `healthkit: false` |
| WearableSleepSummary Zod 스키마 | ✅ 검증 | - |
| estimateSleepQuality | ✅ null-safe, 0-10 범위 | - |

## Feature Flag 구조

| 플래그 | 기본값 | 용도 |
|--------|--------|------|
| healthkit | `false` | 웨어러블 연동 |
| saju | `false` | 사주 분석 |
| uhs | `false` | UHS 스코어 표시 |
| b2b | `false` | B2B API 접근 |
| edgeAI | `false` | Edge Function AI |
| devMode | `false` | 개발자 모드 |
| mockAI | `true` | Mock AI 응답 |

모든 플래그 기본값 = `false` (mockAI 제외). `DEFAULT_FLAGS`, `DEFAULT_FEATURE_FLAGS` 이중 정의.

## Outbox/Sync 구조

- `src/lib/offline/syncQueue.js` — enqueue → persist → flush (online 시)
- Phase 1: `processItem`은 즉시 resolve (로컬 전용)
- `initSyncQueue` — 저장된 큐 로드 + 온라인이면 즉시 flush
- 재시도: 최대 3회, 초과 시 drop

## Persist/Migration

- 모든 Zustand 스토어: Capacitor Preferences persist
- `useSleepStore`: version 1, migrate v0→v1 (빈 상태 → 기본값)
- `useFeatureFlagStore`: version 1, migrate 안전성 테스트 존재

## Zod 파싱

- `DreamAnalysisSchema`, `ForecastPredictionSchema` — AI 응답 검증
- `WearableSleepSummarySchema`, `WearableStatusSchema` — 수면 데이터 검증
- `safeParse` 유틸: throw 대신 `{ success, data, error }` 반환
- fast-check 200 runs: random input에서 crash 0

## Edge Function (서버)

- `supabase/functions/ai-proxy/` — 스텁 핸들러 (Phase 2 LLM 교체 예정)
- `supabase/functions/rate-limit/` — 분당 10, 일당 100
- `supabase/functions/audit-log/` — 민감 필드 자동 strip (14개 키)
- 클라이언트: `ANTHROPIC_API_KEY` 번들 노출 0

## 테스트 구성

| 유형 | 파일 수 | 테스트 수 |
|------|---------|----------|
| Store unit | 7 | 80 |
| Component smoke | 5 | 21 |
| Scoring unit | 2 | 12 |
| Wearable unit | 1 | 34 |
| SyncQueue integration | 1 | 4 |
| Edge adapter contract | 1 | 6 |
| Property/fuzz (fast-check) | 1 | 30 |
| Hardening property | 1 | 36 |
| **합계** | **23** | **240** |

Deno 테스트 (npm verify 외): rate-limit 5개, audit-log 4개

## 보안/PII 현황

- `maskDreamContent()` — 꿈 원문 로그 차단
- `maskSensitiveFields()` — 14개 민감 키 마스킹
- `stripSensitiveFields()` (audit-log) — 서버 측 민감 필드 strip
- 프로덕션 로그 게이팅: `logger` 유틸로 DEV 모드 전용
- 번들 시크릿 스캔: `grep -rE 'sk-ant' dist/` → 0 hits
