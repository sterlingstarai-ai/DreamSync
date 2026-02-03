# Monkey Testing Plan

> DreamSync Release Hardening — 랜덤 입력/비정상 시나리오 테스트 계획

## 목적

사용자가 예상치 못한 행동을 했을 때 앱이 crash 없이 graceful하게 처리하는지 검증.

## 테스트 카테고리

### 1. 랜덤 입력 (Input Fuzzing)

| 대상 | 테스트 내용 | 구현 상태 |
|------|-----------|----------|
| 꿈 텍스트 | 빈 문자열, 10자 미만, 5000자 이상, 특수문자, 이모지, HTML 태그 | ✅ fast-check 프로퍼티 |
| 체크인 값 | condition 0/6, stressLevel -1/100, emotions 빈배열/50개 | ✅ fast-check 프로퍼티 |
| 수면 데이터 | totalSleepMinutes: -1, 0, 99999, null | ✅ wearable.test.js |
| Zod 스키마 | 완전 랜덤 객체 → safeParse | ✅ fast-check 200 runs |

### 2. 백그라운드/복귀 시나리오

| 시나리오 | 예상 동작 | 테스트 방법 |
|---------|----------|-----------|
| 체크인 중 앱 백그라운드 → 복귀 | 진행 상태 유지 | Manual (Capacitor) |
| 꿈 입력 중 백그라운드 → 복귀 | 텍스트 유지 | Manual (Capacitor) |
| 분석 중 백그라운드 → 복귀 | 분석 완료 or 재시도 | Manual |
| 장시간 백그라운드 (24h+) | 날짜 전환 graceful | Unit test (date mock) |

### 3. 네트워크 변동

| 시나리오 | 예상 동작 | 테스트 방법 |
|---------|----------|-----------|
| 온라인 → 오프라인 (작업 중) | 로컬 저장, OfflineBanner 표시 | Playwright offline mode |
| 오프라인 → 온라인 | syncQueue flush, 배너 제거 | Unit test (syncQueue) |
| 간헐적 연결 (3초 on/off) | 데이터 유실 0 | Manual stress test |
| 매우 느린 네트워크 (3G) | 타임아웃 후 graceful error | Playwright throttle |

### 4. 스토리지 압박

| 시나리오 | 예상 동작 | 테스트 방법 |
|---------|----------|-----------|
| Preferences 용량 초과 | graceful 에러, 데이터 유실 최소화 | Manual |
| 90일 수면 데이터 경계 | 자동 trim, 최신 데이터 보존 | ✅ Unit test |
| 동시 쓰기 (race condition) | Zustand 단일 스레드 보장 | ✅ 구조적 안전 |

### 5. 빠른 네비게이션

| 시나리오 | 예상 동작 | 테스트 방법 |
|---------|----------|-----------|
| 탭 빠르게 전환 (10회/초) | 메모리 누수 없음 | Manual + Chrome DevTools |
| 체크인 단계 빠르게 전후 이동 | 상태 정합성 유지 | ✅ Unit test |
| 뒤로가기 → 앞으로가기 반복 | 라우터 안정성 | Manual |

## 자동화 우선순위

### Phase 1 (현재) — Unit/Property 테스트

- [x] 랜덤 입력 fuzzing (fast-check)
- [x] 스코어 범위 불변
- [x] Zod 파싱 crash-free
- [x] 스토어 소스 우선순위
- [x] 90일 캡 경계

### Phase 2 — Playwright Web E2E

- [ ] 핵심 플로우 자동화
- [ ] 오프라인 모드 테스트
- [ ] 네트워크 throttle 테스트

### Phase 3 — Native E2E (Appium/Detox)

- [ ] 백그라운드/복귀
- [ ] HealthKit 권한 거부
- [ ] 실기기 성능 테스트
- [ ] 메모리 프로파일링

## 실행 방법

```bash
# Property/Fuzz 테스트 (현재 사용 가능)
npm test -- --filter hardening

# 전체 테스트 (반복 실행)
npm run test:repeat
```
