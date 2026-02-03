# DreamSync Test Plan

> 핵심 시나리오 체크리스트 — 자동 테스트 + 수동 확인

---

## 자동 테스트 (Vitest)

### 시나리오 1: 오프라인 꿈 전체 플로우
- [x] 꿈 저장 → mock 분석 → 심볼 동기화 (`dreamFlow.test.js`)
- [x] 체크인 → 예보 생성 → 정확도 기록 (`dreamFlow.test.js`)
- [x] 심볼 빈도 누적 (꿈 2건) (`dreamFlow.test.js`)
- [x] 종합 플로우: 꿈 + 체크인 + 예보 + 주간 통계 (`dreamFlow.test.js`)
- [x] 같은 날 체크인 중복 방지 (`dreamFlow.test.js`)
- [x] dream→분석→심볼→체크인→예보 전체 사이클 (`scenarios.test.js`)

### 시나리오 2: Outbox 동기화
- [x] 큐 3건 적재 → storage 영속성 확인 (`syncQueue.test.js`)
- [x] 구독자 알림 + 해제 (`syncQueue.test.js`)
- [x] initSyncQueue → 저장된 큐 복원 (`syncQueue.test.js`)
- [x] clearQueue → storage 비움 (`syncQueue.test.js`)

### 시나리오 3: Feature Flags OFF 기본 상태
- [x] 기본 플래그 상태 검증 (모두 false, mockAI만 true) (`scenarios.test.js`)
- [x] Flags off → 꿈 저장 정상 (`scenarios.test.js`)
- [x] Flags off → 체크인 정상 (`scenarios.test.js`)
- [x] Flags off → 설정 저장/읽기 정상 (`scenarios.test.js`)
- [x] Flags off → 심볼 사전 CRUD 정상 (`scenarios.test.js`)

### 시나리오 4: AI 응답 파싱 실패 (Zod fail)
- [x] 잘못된 형식 → safeParse 실패 반환 (크래시 아님) (`scenarios.test.js`)
- [x] 빈 객체 → safeParse 실패 반환 (`scenarios.test.js`)
- [x] null → safeParse 실패 반환 (`scenarios.test.js`)
- [x] forecast 파싱 실패 → 안전하게 처리 (`scenarios.test.js`)

### 시나리오 5: PII 유출 방지
- [x] mask.js: 13개 민감 필드 마스킹 (`piiSanitization.test.js`)
- [x] 마스킹 결과에 한글 꿈 내용 0 (`piiSanitization.test.js`)
- [x] maskDreamContent: 길이만 반환 (`piiSanitization.test.js`)
- [x] 중첩 객체 민감 필드 마스킹 (`piiSanitization.test.js`)
- [x] Sentry 시뮬레이션: REDACTED 확인 (`piiSanitization.test.js`)
- [x] Mixpanel 시뮬레이션: length/count만 전송 (`piiSanitization.test.js`)

### 시나리오 6: 스토어 마이그레이션
- [x] v0 → v1 전환 (5개 스토어) (`migration.test.js`)
- [x] 빈 상태 → 기본값 반환 (`migration.test.js`)
- [x] null/undefined/손상 데이터 → 기본값 (`migration.test.js`)

---

## 수동 확인 (앱 실행)

### 시나리오 7: Paywall (RevenueCat)
- [ ] N/A — RevenueCat 구현 없음 (Phase 4 예정)
- [ ] 현재 모든 기능 무료 접근 가능 확인

### 시나리오 8: 빌드 무결성
- [x] `npm run verify` 통과 (lint + typecheck + build + test)
- [x] Anthropic key pattern in dist/ 결과 0
- [ ] Vercel 배포 후 정상 로딩 확인
- [ ] iOS Simulator 빌드/실행 확인
- [ ] Android Emulator 빌드/실행 확인

### 시나리오 9: 운영 관측
- [x] Sentry beforeSend → 민감 필드 REDACTED (테스트 검증)
- [x] Mixpanel → free-text 금지, length/hash/category만 허용 (테스트 검증)
- [ ] Sentry release tag 확인 (Supabase 연동 후)
- [ ] Mixpanel build version 확인 (실제 배포 후)

---

## 검증 커맨드

```bash
# 전체 검증 (필수)
npm run verify

# 시크릿 스캔
scripts/check-secrets.sh --all

# 빌드 결과물 키 검사
npm run build && scripts/check-secrets.sh --dist || echo "CLEAN"

# 특정 시나리오 테스트만
npx vitest run src/test/integration/scenarios.test.js
npx vitest run src/test/integration/piiSanitization.test.js
```
