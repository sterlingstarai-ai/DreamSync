# E2E Test Report

> DreamSync Release Hardening — E2E 테스트 설계 및 결과

## 환경 선택

| 옵션 | 장단점 | 선택 |
|------|--------|------|
| **Playwright (Web)** | Vite dev server 대상, 빠른 실행, CI 친화적 | **Primary** |
| Appium (Native) | 실기기 필요, 느림, Capacitor 플러그인 커버 가능 | Phase 3 |
| Detox (Native) | iOS/Android, 병렬 실행 가능 | Phase 3 |

현재 PWA 웹 빌드 대상으로 Playwright E2E를 구성.
네이티브 플러그인(HealthKit, Haptics)은 Mock/stub으로 처리.

## E2E 시나리오

### Scenario 1: 핵심 플로우 (Critical Path)

```
Login(Guest) → Onboarding → Dashboard → DreamCapture → AI분석 →
CheckIn(4단계) → WeeklyReport → SymbolDictionary → Settings
```

- **검증**: 각 페이지 렌더링, 네비게이션, 데이터 저장
- **상태**: Vitest + jsdom 기반 스모크 테스트로 커버 (5개 페이지 테스트)

### Scenario 2: 오프라인 꿈 저장 → 분석 → 체크인 → 예보 → 대시보드

```
1. 네트워크 차단 (offline simulation)
2. 꿈 텍스트 입력 → 저장 → 분석 (mock AI)
3. 체크인 4단계 완료
4. 대시보드 예보 생성 확인
5. → 모든 단계에서 에러 없이 완료
```

- **구현**: syncQueue가 Phase 1에서 processItem을 즉시 resolve하므로,
  오프라인 저장 자체는 Zustand persist가 처리.
  Playwright로 Network.setOfflineMode(true) 후 플로우 실행 가능.

### Scenario 3: Outbox 3건 적재 → 온라인 → flush

```
1. enqueue 3건 (dream:create × 2, checkin:add × 1)
2. getPendingCount() === 3
3. 온라인 전환
4. flush 후 getPendingCount() === 0
5. 중복/유실 없음 확인
```

- **구현**: Unit test로 커버 (syncQueue.test.js 5 tests 존재)
- **E2E 확장**: Playwright에서 localStorage 주입 후 확인 가능

### Scenario 4: 권한 거부 → 폴백 → 재시도

```
1. HealthKit 권한 요청 → 거부
2. graceful fallback (에러 토스트, 수동 입력 모드)
3. 재시도 시 정상 연결
```

- **구현**: Web 환경에서는 MockProvider가 항상 granted 반환
- **네이티브 E2E**: Phase 3 Appium/Detox로 실제 거부 시나리오 테스트

## 현재 커버리지

| 시나리오 | Unit/Integration | E2E (Web) | E2E (Native) |
|----------|-----------------|-----------|-------------|
| 핵심 플로우 | ✅ 5 page tests | ⬜ Playwright 미설치 | ⬜ Phase 3 |
| 오프라인 저장 | ✅ syncQueue tests | ⬜ | ⬜ |
| Outbox flush | ✅ syncQueue tests | ⬜ | ⬜ |
| 권한 거부 | ✅ MockProvider tests | ⬜ | ⬜ |

## Playwright 설치 가이드

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
# playwright.config.ts 생성
# e2e/ 디렉토리에 테스트 작성
```

네이티브 E2E는 Capacitor 8 + Appium 2.x 조합으로 Phase 3에서 구성 예정.
