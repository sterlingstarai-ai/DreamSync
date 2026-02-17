# DreamSync

꿈 기록과 하루 체크인 데이터를 바탕으로 개인 패턴을 요약하고, 다음 날 컨디션 예보를 제공하는 모바일 우선 앱입니다.

## 핵심 기능

- 아침 `꿈 기록` + AI 기반 꿈 분석
- 저녁 `체크인`(컨디션, 감정, 스트레스, 이벤트, 수면)
- `오늘의 예보` 생성 및 실제값 기록(정확도 계산)
- `주간 리포트`(컨디션/감정/심볼 요약)
- `심볼 사전` 자동 축적 및 개인화 의미 편집
- 실험 기능: 웨어러블 연동, UHS 지수, Edge AI 전환(플래그)

## 기술 스택

- Frontend: React 19, React Router 7, Zustand, Tailwind CSS 4
- App shell: Capacitor 8 (iOS/Android)
- Build/Test: Vite 7, Vitest 4, ESLint 9
- AI: Mock 기본 + Supabase Edge Function 프록시(준비)

## 빠른 시작

```bash
npm install
cp .env.example .env
npm run dev
```

## 주요 스크립트

- `npm run dev`: 개발 서버
- `npm run build`: 프로덕션 빌드
- `npm run test`: 테스트 실행
- `npm run lint`: 린트
- `npm run typecheck`: 타입체크
- `npm run verify`: `lint + typecheck + build + test`
- `npm run cap:ios`: iOS 동기화/오픈
- `npm run cap:android`: Android 동기화/오픈

## 환경변수

필수/주요 변수는 `.env.example` 참고:

- `VITE_BACKEND=local|supabase`
- `VITE_AI=mock|edge`
- `VITE_ANALYTICS=mock|mixpanel`
- `VITE_FLAGS=local|remote`
- `VITE_EDGE_FUNCTION_URL` (Edge AI 사용 시)

보안 원칙:

- `ANTHROPIC_API_KEY` 같은 서버 키는 클라이언트 `.env`에 두지 않습니다.
- 서버 키는 Supabase Edge Function Secrets에만 저장합니다.

## 현재 아키텍처 요약

실제 런타임 데이터 흐름은 아래 순서를 따릅니다.

1. Page/Component
2. Hook (`src/hooks/*`)
3. Zustand Store (`src/store/*`)
4. Adapter (`src/lib/adapters/*`)
5. External/API/Capacitor

상세는 `ARCHITECTURE.md`를 참고하세요.

## 프로젝트 상태

- 로컬 우선 MVP 플로우는 동작하며 테스트가 구성되어 있습니다.
- Supabase API/Edge 연동은 일부 스텁/준비 단계가 포함됩니다.
- 문서/레거시 서비스 코드 정리가 진행 중이며, 최신 구조는 `src/hooks`, `src/store`, `src/lib/adapters`가 기준입니다.
