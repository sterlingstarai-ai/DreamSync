# DreamSync Full Review Report

> CTO 리뷰: 제품 개발 최종 검증 결과
> 날짜: 2026-02-03
> 검증 도구: ESLint, TypeScript (`tsc --noEmit`), Vite build, Vitest 170 tests

---

## 요약

| 항목 | 결과 |
|------|------|
| npm run verify | PASS (lint + typecheck + build + 170 tests) |
| 테스트 파일 | 21 files |
| 테스트 수 | 170 tests |
| lint errors | 0 |
| lint warnings | 24 (모두 허용 수준: exhaustive-deps, set-state-in-effect) |
| 클라이언트 번들 LLM 키 | 0 |
| PII 유출 경로 | 0 |
| Feature flags 기본값 | 정책 준수 (모두 false, mockAI만 true) |

---

## 발견사항

### P0: Critical (보안/런타임 크래시)

#### P0-1: RUNBOOK.md에 VITE_ANTHROPIC_API_KEY 기재 [FIXED]

- **파일**: `RUNBOOK.md` lines 128, 140
- **재현**: RUNBOOK대로 환경변수 설정 시 `VITE_` 접두사로 인해 Vite가 클라이언트 번들에 API 키 포함
- **원인**: 문서 오류 — Edge Function 프록시 아키텍처와 불일치
- **수정**: `VITE_ANTHROPIC_API_KEY` → `ANTHROPIC_API_KEY`는 Supabase Secrets에만 설정하도록 변경
- **영향**: 문서를 따르는 모든 배포 환경
- **테스트**: N/A (문서 수정)

#### P0-2: RUNBOOK.md에 `VITE_AI=claude` (존재하지 않는 어댑터) [FIXED]

- **파일**: `RUNBOOK.md` lines 72, 123, 135
- **재현**: `VITE_AI=claude` 설정 시 ai.js에서 `Unknown AI adapter` 경고 후 mock으로 fallback — 사용자에게는 AI 동작하는 것처럼 보이지만 실제로는 mock
- **원인**: AI 어댑터 레지스트리는 `mock` | `edge`만 지원. `claude`는 존재하지 않음
- **수정**: `claude` → `edge`로 교체
- **영향**: Staging/Production 환경 설정
- **테스트**: N/A (문서 수정)

#### P0-3: .gitignore에 .env 패턴 누락 [FIXED]

- **파일**: `.gitignore`
- **재현**: `git check-ignore .env` → 무시 안 됨. `.env` 파일 생성 시 git 추적 대상
- **원인**: 초기 Vite 템플릿의 .gitignore에 `.env` 패턴 미포함
- **수정**: `.env`, `.env.local`, `.env.*.local` 패턴 추가
- **영향**: 모든 개발자 — 실수로 API 키 커밋 가능성
- **테스트**: `git check-ignore .env` → 정상 무시

#### P0-4: edge.js `getAuthToken()` localStorage 직접 접근 [FIXED]

- **파일**: `src/lib/adapters/ai/edge.js` line 33
- **재현**: 네이티브 플랫폼에서 `localStorage.getItem('dreamsync-auth')` 호출 → null 반환 (Capacitor Preferences에 저장됨)
- **원인**: Zustand persist가 Capacitor Preferences를 사용하지만, getAuthToken은 동기 접근을 위해 localStorage 직접 참조
- **수정**: `storage` adapter import + `getAuthToken()` async 전환
- **영향**: 네이티브 빌드에서 auth 토큰 누락으로 Edge Function 인증 실패
- **테스트**: edge.test.js — storage adapter mock으로 검증

---

### P1: Medium (죽은 코드/잠재적 오류)

#### P1-1: schemas.js `parse()` 함수 — 미사용 + 예외 미처리 [FIXED]

- **파일**: `src/lib/ai/schemas.js` lines 86-94
- **재현**: `parse(schema, badData)` 호출 시 ZodError 예외 발생 (try/catch 없음)
- **원인**: `safeParse()`만 사용되고 `parse()`는 미사용 dead export
- **수정**: `parse()` 함수 삭제
- **영향**: 없음 (미사용 코드)
- **테스트**: schemas import 확인 — `safeParse`만 사용

#### P1-2: src/lib/services/ 디렉토리 — 8개 파일 전체 미사용

- **파일**: `src/lib/services/*.js` (8 files)
- **재현**: `grep -r "from.*services" src/` 결과 0건
- **원인**: Phase 2+ 서비스 레이어로 설계했으나, hooks가 stores를 직접 사용하는 구조로 구현됨
- **수정**: 미수정 (Phase 2에서 hooks→services 전환 시 사용 예정). Dead code이나 향후 계획된 코드.
- **영향**: 번들 크기 영향 없음 (tree-shaking 대상)
- **테스트**: N/A

#### P1-3: src/lib/storage.js — adapter 패턴으로 대체된 구 파일 [FIXED]

- **파일**: `src/lib/storage.js` (41 lines)
- **재현**: `grep -r "from.*lib/storage" src/` 결과 0건 (모든 코드가 `adapters/storage` 사용)
- **원인**: adapter 패턴 도입 전 초기 구현 잔재
- **수정**: 파일 삭제
- **영향**: 없음 (import 0회)

#### P1-4: src/store/useAppStore.js — 미사용 스캐폴딩 [FIXED]

- **파일**: `src/store/useAppStore.js` (15 lines)
- **재현**: 자기 참조 외 import 0건
- **원인**: 초기 스캐폴딩 잔재. ErrorBoundary + 페이지별 에러 상태로 대체됨
- **수정**: 파일 삭제
- **영향**: 없음 (import 0회)

#### P1-5: Sentry/Mixpanel/audit-log 민감 필드 목록 불일치 [FIXED]

- **파일**: `sentry.js`, `mixpanel.js`, `audit-log/index.ts`
- **재현**: `interpretation`, `meaning`, `note`, `text` 키가 Sentry extra에 포함되면 REDACTED 미처리
- **원인**: mask.js 13개 키 vs Sentry 8개 패턴 vs Mixpanel 12개 키 — 동기화 누락
- **수정**: 모든 채널이 mask.js SENSITIVE_KEYS 13개와 동일하게 맞춤
- **영향**: PII 유출 경로 잠재적 존재 → 제거
- **테스트**: piiSanitization.test.js 기존 테스트 커버

#### P1-6: RUNBOOK.md `reportService.exportAllData()` 참조 — 실제 미사용 [FIXED]

- **파일**: `RUNBOOK.md` line 175-177
- **재현**: RUNBOOK 데이터 복구 가이드 실행 시 `reportService` import 실패
- **원인**: 서비스 레이어가 실제로 사용되지 않으므로 문서가 실제 코드와 불일치
- **수정**: 실제 동작하는 store 직접 접근 코드로 교체
- **영향**: 운영 가이드

---

### P2: Low (미사용 플래그/문서)

#### P2-1: `saju` feature flag — 선언만, UI 구현 0

- **파일**: `src/constants/featureFlags.js` line 9
- **상태**: Phase 3 예정. 현재는 dead flag.
- **수정**: 미수정 (Phase 3까지 유지)

#### P2-2: `b2b` feature flag — 선언만, 서비스 import 0

- **파일**: `src/constants/featureFlags.js` line 11, `src/lib/services/b2bService.js`
- **상태**: Phase 4 예정. b2bService.js 존재하나 import하는 코드 0
- **수정**: 미수정 (Phase 4까지 유지)

#### P2-3: Store migrate 함수 — 모두 passthrough

- **파일**: 모든 7개 store의 `migrate` 함수
- **상태**: `version: 1`이고 migrate는 `{...defaults, ...persisted}` passthrough
- **리스크**: v2로 올릴 때 실제 마이그레이션 로직 필요. 현재 migration.test.js가 이를 증명.
- **수정**: 미수정 (v1→v2 전환 시 처리)

---

## 보안 검증 결과

| 검사 항목 | 결과 |
|-----------|------|
| Anthropic key pattern in src/ | 0 matches |
| `api.anthropic.com` in src/ | 0 matches |
| `VITE_ANTHROPIC` in src/ | 0 matches |
| `require()` in src/ | 0 matches (ESM 순수) |
| Dream content in logger calls | 모두 `maskDreamContent()` 사용 |
| Sentry beforeSend | sensitivePatterns로 REDACTED |
| Mixpanel event payload | sensitiveFields → length/count만 전송 |
| audit-log | stripSensitiveFields 적용 |
| pre-commit hook | `scripts/check-secrets.sh` 7 패턴 스캔 |
| `.env` in .gitignore | ✅ `.env`, `.env.local`, `.env.*.local` 추가 |
| `localStorage` in src/ (edge.js) | ✅ storage adapter로 교체 |
| `eval()` / `innerHTML` in src/ | 0 matches (XSS 벡터 없음) |
| dead code (storage.js, useAppStore.js) | ✅ 삭제 완료 |

---

## 테스트 커버리지 (170 tests / 21 files)

| 카테고리 | 파일 수 | 테스트 수 |
|----------|---------|----------|
| 스토어 (단위) | 5 | 55 |
| 스코어링 (단위) | 2 | 12 |
| 페이지 (UI) | 5 | 21 |
| 오프라인 큐 | 1 | 5 |
| Edge AI 어댑터 | 1 | 6 |
| Remote Flags 어댑터 | 1 | 6 |
| 통합: 크로스스토어 플로우 | 1 | 5 |
| 통합: 동기화 큐 | 1 | 4 |
| 통합: 마이그레이션 | 1 | 10 |
| 통합: PII 유출 방지 | 1 | 9 |
| 통합: 시나리오 (AI fail, flags off, full cycle) | 1 | 10 |
| Auth 스토어 | 1 | 11 |
| **합계** | **21** | **170** |
