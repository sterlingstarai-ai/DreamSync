# DreamSync Fix Log

> 최종 검증 과정에서 수행된 모든 수정 기록

---

## Fix 1: RUNBOOK.md — VITE_ANTHROPIC_API_KEY 제거 [P0]

**무엇**: Staging/Production 환경변수에서 `VITE_ANTHROPIC_API_KEY` 제거
**왜**: `VITE_` 접두사는 Vite가 클라이언트 번들에 포함시킴. API 키가 브라우저에 노출되는 보안 결함.
**변경**: `RUNBOOK.md` lines 128, 140 — Supabase Secrets 가이드로 교체
**검증**: `npm run verify` PASS (170 tests)

## Fix 2: RUNBOOK.md — VITE_AI=claude → edge [P0]

**무엇**: AI 어댑터 값 `claude` → `edge`로 교체
**왜**: AI 어댑터 레지스트리는 `mock | edge`만 지원. `claude`는 존재하지 않아 silent fallback to mock 발생.
**변경**: `RUNBOOK.md` lines 72, 123, 135
**검증**: `npm run verify` PASS

## Fix 3: schemas.js — dead `parse()` export 삭제 [P1]

**무엇**: `src/lib/ai/schemas.js`에서 `parse()` 함수 삭제 (lines 86-94)
**왜**: 코드베이스에서 0회 import. `safeParse()`만 사용됨. `parse()`는 예외 처리 없이 throw하므로 실수로 import 시 런타임 크래시 유발.
**변경**: `src/lib/ai/schemas.js` — `parse()` 함수 및 JSDoc 삭제
**검증**: `npm run verify` PASS (기존 테스트 모두 통과, import 영향 없음)

## Fix 4: RUNBOOK.md — reportService 참조 교체 [P1]

**무엇**: 데이터 복구 가이드에서 `reportService.exportAllData()` → 실제 store 접근 코드로 교체
**왜**: `src/lib/services/` 전체가 미사용. RUNBOOK 가이드 실행 시 import 실패.
**변경**: `RUNBOOK.md` lines 174-178 — 4개 store에서 직접 데이터 추출하는 코드로 교체
**검증**: `npm run verify` PASS

## Fix 5: RUNBOOK.md — AI 폴백 설명 업데이트 [P1]

**무엇**: 긴급대응 > AI 서비스 장애 섹션 업데이트
**왜**: "Claude 실패 시" → Edge Function 아키텍처 반영. 폴백 로직 설명 추가.
**변경**: `RUNBOOK.md` — Edge Function fallback (최대 5회), 429 rate limit 설명
**검증**: `npm run verify` PASS

## Fix 6: 시나리오 통합 테스트 추가 [검증]

**무엇**: `src/test/integration/scenarios.test.js` 생성 (10 tests)
**왜**: 핵심 시나리오 검증 — AI 파싱 실패, feature flags off, 오프라인 전체 플로우
**변경**: 신규 파일 1개, 테스트 10개 추가
**검증**: `npm run verify` PASS (160 → 170 tests)

## Fix 7: .gitignore — .env 누락 [P0]

**무엇**: `.gitignore`에 `.env`, `.env.local`, `.env.*.local` 패턴 추가
**왜**: .env 파일이 git에 추적되어 실수로 API 키/시크릿이 커밋될 수 있음.
**변경**: `.gitignore` — 환경변수 패턴 3줄 추가
**검증**: `git check-ignore .env` → 정상 무시됨

## Fix 8: edge.js — localStorage 직접 접근 제거 [P0]

**무엇**: `getAuthToken()`이 `localStorage.getItem()` 직접 호출 → `storage` adapter 사용으로 전환
**왜**: 프로젝트 원칙 "localStorage 사용 금지" 위반. 네이티브에서 토큰 접근 불가.
**변경**: `src/lib/adapters/ai/edge.js` — `import storage from '../storage'`, `getAuthToken()` async 전환
**검증**: `npm run verify` PASS (170 tests)

## Fix 9: dead code 삭제 [P1]

**무엇**: `src/lib/storage.js` + `src/store/useAppStore.js` 삭제
**왜**: 두 파일 모두 import 0회. storage.js는 adapter 패턴으로 대체됨. useAppStore는 초기 스캐폴딩 잔재.
**변경**: 2개 파일 삭제 (~56줄)
**검증**: `npm run verify` PASS

## Fix 10: DreamAnalysisSchema — reflectionQuestions 누락 [P2]

**무엇**: `DreamAnalysisSchema`에 `reflectionQuestions: z.array(z.string()).optional()` 추가
**왜**: mock AI가 `reflectionQuestions`를 생성하지만 Zod 스키마에 없어 `safeParse()` 시 자동 strip됨. 사용자에게 유용한 질문 데이터 유실.
**변경**: `src/lib/ai/schemas.js` — DreamAnalysisSchema에 optional 필드 1개 추가
**검증**: `npm run verify` PASS (170 tests)

## Fix 11: Sentry/Mixpanel/audit-log — 민감 필드 목록 불일치 [P1]

**무엇**: Sentry `sensitivePatterns`에 `/interpret/i, /meaning/i, /\bnote\b/i, /\btext\b/i` 추가. Mixpanel `sensitiveFields`에 `meaning, note` 추가. audit-log `SENSITIVE_FIELDS`에 `dream, healthData, sleepData, hrvData` 추가.
**왜**: mask.js의 SENSITIVE_KEYS 13개와 Sentry/Mixpanel/audit-log의 민감 필드 목록이 불일치. `interpretation`, `meaning`, `note`, `text` 등이 Sentry에서 REDACTED 처리되지 않음.
**변경**: `src/lib/adapters/analytics/sentry.js`, `src/lib/adapters/analytics/mixpanel.js`, `supabase/functions/audit-log/index.ts`
**검증**: `npm run verify` PASS (170 tests)

---

## 이전 세션 수정 요약 (production hardening)

| 수정 | 파일 | 테스트 |
|------|------|--------|
| Edge Function 스켈레톤 (8 files) | supabase/functions/*, src/lib/adapters/ai/edge.js | 6 tests |
| Remote flags: localStorage → Preferences | src/lib/adapters/flags/remote.js | 6 tests |
| 데이터 삭제: storage.clear() 추가 | src/pages/Settings.jsx | — |
| Pre-commit 시크릿 스캔 | scripts/check-secrets.sh | — |
| PII 유출 방지 테스트 | src/test/integration/piiSanitization.test.js | 9 tests |
| 마이그레이션 테스트 | src/test/integration/migration.test.js | 10 tests |
| 크로스스토어 플로우 테스트 | src/test/integration/dreamFlow.test.js | 5 tests |
| 동기화 큐 테스트 | src/test/integration/syncQueue.test.js | 4 tests |
