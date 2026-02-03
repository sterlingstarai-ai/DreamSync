# Changelog

All notable changes to DreamSync will be documented in this file.

## [Unreleased]

### Added

#### Core Features (Phase 1)
- **DreamCapture**: 꿈 텍스트 입력, 음성 입력 (Web Speech API), AI 분석
- **CheckIn**: 30초 저녁 체크인 (컨디션, 감정, 스트레스, 이벤트, 수면)
- **Dashboard**: 오늘의 예보, 빠른 액션, 주간 통계, 최근 꿈
- **WeeklyReport**: 주간 패턴, 상관관계 분석, 차트
- **SymbolDictionary**: 개인 심볼 사전, 빈도/트렌드, 검색/필터
- **Settings**: Feature Flag 토글, 데이터 내보내기/삭제

#### Phase 2 준비
- **HealthKit/Health Connect**: Mock 구현체, useHealthKit 훅
- 수면 데이터 수동 입력 UI (SleepInput 컴포넌트)
- Confidence 점수에 수면 데이터 반영

#### Phase 4 준비
- **UHS (Unconscious Health Score)**: 계산 로직, 컴포넌트
  - ⚠️ 의료/진단 표현 금지, "참고 지표" 고정 문구
- **B2B**: 서버 스텁 구조 (API key 인증, 쿼터, 로그)

### Architecture

#### Adapter 패턴
- Storage: Local (Capacitor Preferences) / Supabase
- AI: Mock / Claude
- Analytics: Noop / Mixpanel + Sentry
- Flags: Local / Remote

#### 서비스 레이어
- dreamService, checkinService, forecastService
- uhsService, reportService, symbolService

#### 테스트
- Vitest 설정
- confidence/uhs 스코어링 단위 테스트
- Mock AI 응답 검증 테스트

### Security
- localStorage → Capacitor Preferences 마이그레이션
- 민감 데이터 (꿈/감정/건강) Sentry/Mixpanel 전송 금지
- 길이/해시만 분석 데이터로 허용

### Documentation
- ARCHITECTURE.md: 레이어 구조, Adapter 선택 방식
- DATA_MODEL.md: 엔티티 스키마, 스코어링 공식
- RUNBOOK.md: 문제 해결 가이드
- CHANGELOG.md: 변경 이력

## [0.0.1] - 2026-02-03

### Added
- 프로젝트 초기 설정
  - Vite 7 + React 19
  - Tailwind CSS 4
  - Capacitor 8 (iOS/Android)
  - Zustand 상태관리
  - PWA (vite-plugin-pwa)
- Capacitor 플러그인
  - @capacitor/app
  - @capacitor/status-bar
  - @capacitor/splash-screen
  - @capacitor/keyboard
  - @capacitor/haptics
  - @capacitor/network
  - @capacitor/preferences
  - @capacitor/local-notifications
- Xcode Cloud 지원 파일
- 다크 모드 디자인 시스템

---

## Version Numbering

- **Major**: 비호환 API 변경
- **Minor**: 새 기능 추가 (하위 호환)
- **Patch**: 버그 수정

## Feature Flags

| Flag | Default | Added |
|------|---------|-------|
| healthkit | false | 0.1.0 |
| saju | false | - |
| uhs | false | 0.1.0 |
| b2b | false | 0.1.0 |
