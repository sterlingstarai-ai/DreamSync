# Hardening Gate

> DreamSync Release Hardening — 모든 커밋/PR이 통과해야 하는 품질 게이트

## 1. 필수 통과 조건 (CI 자동)

| Gate | 명령어 | 기준 |
|------|--------|------|
| Lint | `npm run lint` | 0 errors (warnings 허용) |
| Typecheck | `npm run typecheck` | 0 errors |
| Build | `npm run build` | exit 0 |
| Unit/Integration Tests | `npm test` | 0 failures |
| Verify (통합) | `npm run verify` | 위 4개 순차 통과 |

## 2. 반복 실행 조건 (플래키 제로)

| Gate | 명령어 | 기준 |
|------|--------|------|
| 반복 실행 | `npm run test:repeat` | 3회 연속 0 failures |

CI에서 `vitest run --retry 0 --reporter verbose` × 3회 실행.
1회라도 실패 시 → PR 차단.

## 3. 보안/PII 조건

| 검사 | 기준 |
|------|------|
| 번들 시크릿 스캔 | `grep -rE 'sk-ant|ANTHROPIC_API_KEY|password\s*=' dist/` → 0 hits |
| PII 로그 방지 | audit-log에 dream content 원문 0 |
| Feature flag 기본값 | 모든 플래그 `default: false` |
| 환경변수 접두사 | 서버 키에 `VITE_` 접두사 없음 |

## 4. 프로퍼티/뮤테이션 테스트

| Gate | 기준 |
|------|------|
| 프로퍼티 테스트 | fast-check 기반 테스트 0 failures |
| 뮤테이션 생존율 | 핵심 모듈 mutant survival < 30% (목표) |

## 5. E2E 조건 (수동/Playwright)

| 시나리오 | 기준 |
|----------|------|
| 핵심 플로우 | Login → Dream → CheckIn → Dashboard 완주 |
| 오프라인 저장 | 오프라인 상태에서 꿈 저장 → 큐잉 확인 |
| 권한 거부 폴백 | HealthKit 권한 거부 시 graceful fallback |

## 현재 상태

```
✅ npm run verify: 통과 (23 files, 234 tests, 0 errors)
✅ 번들 시크릿 스캔: 통과
✅ Feature flag 기본값: 모두 false
✅ 반복 실행 게이트: 3회 연속 0 failures (npm run test:repeat)
✅ 프로퍼티 테스트: fast-check 30 프로퍼티, ~1,400 random inputs
✅ 뮤테이션 테스트: 핵심 6개 모듈 전수 커버 (MUTATION_REPORT.md)
✅ E2E: Vitest + jsdom 스모크 5개 페이지 (Playwright Phase 2 예정)
✅ CI: Flaky guard (3x repeat) 스텝 추가
```
