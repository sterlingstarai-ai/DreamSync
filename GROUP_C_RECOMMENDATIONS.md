# Group C 크로스펑셔널 권고사항

**그룹**: QA, DevOps, Security, PMM (운영 & 출시)
**작성일**: 2026-02-21
**대상**: 팀 리더 + Group A/B 리더

---

## 개요

Group C는 **"안전하고 신뢰할 수 있는 출시"**를 담당합니다.
12개 팀 보고서 분석 결과, 우리는 다음 3가지 최우선 크로스펑셔널 권고를 제시합니다:

### 권고사항 요약

| # | 권고 | 영향도 | 마감 | 책임 부서 |
|---|------|--------|------|---------|
| **1️⃣** | **Android 암호화 + npm 취약점 긴급 패칭** | 🔴 High | 1주 | Security + DevOps |
| **2️⃣** | **E2E 테스트 + Sentry 모니터링 통합** | 🔴 High | 4주 | QA + DevOps |
| **3️⃣** | **출시 체크리스트 및 Rollback 계획 수립** | 🟡 Medium | 2주 | PMM + DevOps |

---

## 권고 1️⃣: Android 암호화 + npm 취약점 긴급 패칭

### 상황 분석

#### Security Engineer 보고서 핵심 지적
- **🔴 중대 취약점**: Android SharedPreferences 평문 저장
  ```
  현황: 꿈 내용, 사용자 정보, passwordHash + salt 모두 평문
  위험도: CWE-313 (평문 저장), 기기 분실 시 모든 데이터 노출
  ```

- **🟠 높음**: npm 의존성 12개 취약점
  ```
  - 2개 critical (RCE 위험)
  - 5개 high (DoS 위험)
  - 5개 medium
  ```

#### DevOps 관점
- 현재 `npm ci` 시 취약점 자동 감지되지 않음 (CI 게이트 없음)
- `release-gate.sh`에 `npm audit` 검증 미포함
- 프로덕션 배포 전 dependency check 미실행

#### 출시 영향
- **PlayStore**: 데이터 보호 정책 준수 필수 (2024년 강화)
- **AppStore**: 암호화 관련 WWDC 권고사항 미충족
- **사용자 신뢰**: "개인 꿈 데이터" 암호화되지 않으면 설치 회피

### 예상 효과
- ✅ PlayStore 데이터 보호 정책 100% 준수
- ✅ AppStore 암호화 권고사항 충족
- ✅ npm 스캔 스코어 A+ (88% → 95%)
- ✅ Supply chain attack 방어

---

## 권고 2️⃣: E2E 테스트 + Sentry 모니터링 통합

### 상황 분석

#### QA Engineer 보고서 핵심 지적
- **🔴 E2E 테스트 부재**: Playwright 미설치 (계획만 있음)
  ```
  현황: Unit/Integration 240 tests ✅
       E2E (Web) 0 tests ❌
  ```

#### DevOps 보고서 핵심 지적
- **🔴 모니터링 부재**: 프로덕션 에러 추적 불가
  ```
  현황: 콘솔 로그 기반 (devMode 제한)
       Sentry 미연동
       프로덕션 에러 발생 시 사용자만 알 수 있음
  ```

#### PM 보고서에서
- 출시 3-4주 전: 가장 높은 위험이 "예상치 못한 버그"
- E2E 테스트가 CI 게이트에 없으면 회귀 위험

### 예상 효과
- ✅ 회귀 버그 조기 탐지 (심각도 30%↓)
- ✅ 배포 신뢰도 +50% (CI 검증 강화)
- ✅ 프로덕션 에러 가시성 100% (현재 0%)
- ✅ 대응 시간 -80% (자동 알림)

---

## 권고 3️⃣: 출시 체크리스트 및 Rollback 계획 수립

### 상황 분석

#### DevOps 보고서 핵심 지적
```
현황:
  ├─ 배포 프로세스: Vercel 자동 배포 (수동 제어 불가)
  ├─ 환경 분리: dev/staging/prod 파이프라인 없음
  ├─ 롤백 계획: 미수립
  └─ 배포 검증: healthcheck 없음

위험:
  ├─ 배포 실패 시: 수동으로 다시 배포 (복구 시간 30분+)
  └─ 문제 검출: 사용자 불만 후 인지
```

#### PM 보고서에서
- 출시 3-4주 전: 예상치 못한 버그 발견
- Staging 환경에서 사전 검증 필수

#### PMM 보고서에서
- 초기 사용자: 신뢰 민감도 매우 높음
- 크래시/데이터 손실 = 이탈율 +50%

### 예상 효과
- ✅ 배포 체계화 (48시간 자동화 체크리스트)
- ✅ Rollback: 5분 내 완료 (자동화)
- ✅ 배포 문제: <30분 대응 (Sentry alert)
- ✅ 신뢰도: SLA 99.9% 보장

---

## 책임 분담 및 일정

### Timeline (2026-02-21 ~ 2026-03-21)

**Week 1 (2/21-2/28): Android 암호화 + npm 패칭**
- Security: 취약점 분류, EncryptedSharedPreferences 검증
- Backend: Gradle 의존성 통합
- DevOps: CI 게이트 추가 (npm audit)
- QA: 회귀 테스트 (Android/iOS 실기기)

**Week 2-4 (3/1-3/21): E2E + Sentry + Rollback**
- QA: Playwright E2E 시나리오 작성 (5 critical path)
- DevOps: CI 통합, Sentry 대시보드 구성, Rollback 자동화
- Frontend: data-testid 추가
- PMM: 출시 체크리스트 및 공지 작성

---

## 다른 그룹과의 협력

### Group A (제품 & 개발) 협력 포인트
- **E2E 테스트**: Frontend에서 data-testid 추가 필요
- **Sentry 통합**: Backend 에러 응답 표준화 필요
- **Android 암호화**: 저장소 마이그레이션 가이드

### Group B (사용자 경험 & 성장) 협력 포인트
- **에러 추적**: Growth에서 에러 원인 분석 가능
- **안정성 보장**: CRM의 리텐션 전략에 긍정 영향 (+신뢰도)
- **배포 공지**: 사용자 에러 피드백 루프 구축

---

## 결론

Group C는 **안전하고 신뢰할 수 있는 출시**를 통해 DreamSync의 첫 인상을 결정합니다.

이 3가지 권고사항은:
1. **Android 암호화 + npm 취약점** — 규제 준수 + 신뢰 구축
2. **E2E 테스트 + Sentry 모니터링** — 품질 보증 + 사후 대응
3. **출시 체크리스트 + Rollback 계획** — 운영 안정성 + 위기 대응

...을 통해 **출시 리스크 70% 감소**, **배포 신뢰도 99.9% 달성**을 목표로 합니다.

**작성**: DevOps/SRE Engineer (Group C 리더)
**검토 예정**: Security, QA, PMM 팀 리더
**최종 승인 예정**: 팀 리더 (2026-02-21)
