# DreamSync 자동 테스트·실구동 운영 가이드

이 문서는 DreamSync를 가능한 한 적은 사람 개입으로 검증/실행/배포하기 위한 단일 운영 기준 문서다.

## 1. 목표

- 목표 1: 코드 변경 시 자동으로 품질 게이트를 통과/차단한다.
- 목표 2: 실제 구동(Web/iOS/Android) 경로를 표준화해서 재현 가능하게 만든다.
- 목표 3: 사람이 개입하는 시점을 최소화하고, 개입 지점 자체를 명확히 제한한다.

## 2. 기본 원칙

- 원칙 1: 로컬은 `npm run verify` 하나로 품질 판단을 끝낸다.
- 원칙 2: CI는 PR/Push 시 동일한 기준으로 자동 검증한다.
- 원칙 3: 릴리즈 후보는 `scripts/release-gate.sh`로 추가 게이트를 통과해야 한다.
- 원칙 4: 실패 시 “원인 분류 → 단일 수정 → 재검증”만 수행한다.

## 3. 현재 저장소 기준 자동화 자산

- 표준 검증 명령: `npm run verify`
- 반복(flaky) 검증: `npm run test:repeat`
- 릴리즈 게이트: `bash scripts/release-gate.sh --repeat 20`
- 시크릿 검사: `bash scripts/check-secrets.sh --all`
- CI 워크플로우: `/Users/jmac/Desktop/DreamSync/.github/workflows/ci.yml`
  - 트리거: `main` 대상 `push`, `pull_request`
  - 실행: `lint`, `typecheck`, `build`, `test`, `test:repeat`

## 4. 1회성 초기 설정 (최초 1회만)

```bash
cd /Users/jmac/Desktop/DreamSync
npm install
cp .env.example .env
```

로컬 기본 실행 모드:

```env
VITE_BACKEND=local
VITE_AI=mock
VITE_ANALYTICS=mock
VITE_FLAGS=local
```

권장 Node 버전:

- CI 기준 Node `20`을 사용하므로 로컬도 Node 20으로 맞춘다.

## 5. 일상 개발/검증 표준 플로우 (사람 개입 최소)

### 5.1 개발 중

```bash
npm run dev
```

### 5.2 변경 검증 (필수)

```bash
npm run verify
```

### 5.3 릴리즈 후보 검증 (권장, merge 전 1회)

```bash
bash scripts/release-gate.sh --repeat 20
```

이 스크립트는 아래를 자동으로 검사한다.

- `verify` 통과 여부
- `dist/` 시크릿 노출 패턴
- PII 잠재 누출 패턴
- feature flag 기본값 안전성
- 테스트 반복 실행으로 flaky 검출

## 6. 실제 구동 절차 (Web/iOS/Android)

### 6.1 Web 실구동

개발 서버:

```bash
npm run dev
```

배포 유사 모드(프로덕션 번들 확인):

```bash
npm run build
npm run preview
```

### 6.2 iOS 실구동

```bash
npm run cap:sync
npm run cap:ios
```

필요 시(동기화/Pod 이슈):

```bash
cd ios/App && pod install --repo-update && cd ../..
```

### 6.3 Android 실구동

```bash
npm run cap:sync
npm run cap:android
```

필요 시(Gradle 캐시 이슈):

```bash
cd android && ./gradlew clean && cd ..
```

## 7. PR부터 배포까지 무인화 운영 모델

### 7.1 PR 생성

- 개발자는 코드 푸시만 한다.
- CI가 자동 실행되어 성공/실패를 판단한다.

### 7.2 Merge 조건

- CI 녹색(성공) + 리뷰 기준 충족 시에만 merge한다.
- 실패 시 merge 금지(자동 차단 원칙).

### 7.3 main 반영 후

- `main` push로 CI가 재실행된다.
- 호스팅 플랫폼(Vercel/Netlify/Render 등) Git 연동이 되어 있으면 자동 배포가 수행된다.
- 수동 배포는 장애/롤백 상황에서만 사용한다.

## 8. 실패 시 자동 우선 대응 순서

- 1단계: CI 로그에서 실패 단계 확인 (`lint`/`typecheck`/`build`/`test`/`test:repeat`)
- 2단계: 로컬에서 동일 단계만 재현
- 3단계: 수정 후 `npm run verify` 재실행
- 4단계: 필요 시 `release-gate.sh` 재실행

이 순서를 벗어난 임의 조치는 금지한다. (원인 추적이 어려워짐)

## 9. 사람 개입이 필요한 최소 지점

- 환경변수/시크릿 발급 및 교체
- 앱 스토어 제출/심사 대응
- 프로덕션 feature flag 정책 변경
- 장애 시 롤백 최종 승인

그 외(검증/회귀 확인/기본 배포)는 자동화 경로를 기본으로 사용한다.

## 10. 운영 체크리스트 (복붙용)

PR 전:

```bash
npm run verify && bash scripts/check-secrets.sh --all
```

릴리즈 전:

```bash
bash scripts/release-gate.sh --repeat 20
```

Web 실구동 확인:

```bash
npm run build && npm run preview
```

모바일 실구동 확인:

```bash
npm run cap:ios
npm run cap:android
```

## 11. 권장 고도화 (추가 개입 더 줄이기)

- CI에 `release-gate.sh`를 별도 nightly 스케줄로 추가한다.
- 배포 후 smoke 테스트를 Playwright로 자동 실행한다.
- CI 실패 유형별 템플릿(원인/조치/재발방지) 자동 코멘트를 연결한다.
- 실패 알림을 Slack/Teams로 연동해 “사람이 대시보드 열어보는 작업”을 제거한다.

---

운영 결론:

- 일상 개발은 `npm run verify` 중심,
- 릴리즈는 `release-gate.sh` 중심,
- 실제 구동은 `build/preview` + `cap:*` 중심으로 통일하면
- 대부분의 품질 판단을 자동화할 수 있고 사람 개입은 승인/비상 대응으로 제한된다.
