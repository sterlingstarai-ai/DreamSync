# DreamSync 프로젝트 컨텍스트

> Claude Code가 이 프로젝트를 빠르게 이해하기 위한 메모리 파일

## 프로젝트 개요

**DreamSync** - React + Capacitor 하이브리드 앱

- **타입**: React PWA + Capacitor 네이티브 앱 (iOS/Android)
- **버전**: 0.0.1
- **상태**: 기초 설정 완료

## 기술 스택

```
React 19 + Vite 7
Tailwind CSS 4
Capacitor 8 (iOS/Android)
Zustand (상태관리)
PWA (vite-plugin-pwa)
```

## 설치된 Capacitor 플러그인

| 플러그인 | 용도 |
|---------|------|
| @capacitor/app | 앱 생명주기, 백버튼 |
| @capacitor/status-bar | 상태바 스타일 |
| @capacitor/splash-screen | 스플래시 화면 |
| @capacitor/keyboard | 키보드 이벤트 |
| @capacitor/haptics | 진동 피드백 |
| @capacitor/network | 네트워크 상태 |
| @capacitor/preferences | 로컬 저장소 |

## 주요 설정값

| 항목 | 값 |
|------|-----|
| App ID | `com.dreamsync.app` |
| Web Dir | `dist` |

## 폴더 구조

```
src/
├── components/     # React 컴포넌트
├── pages/          # 페이지 컴포넌트
├── hooks/          # 커스텀 훅
├── lib/            # 유틸리티
│   ├── capacitor.js  # Capacitor 초기화
│   └── storage.js    # 저장소 유틸
├── store/          # Zustand 스토어
│   └── useAppStore.js
├── constants/      # 상수
├── App.jsx         # 메인 앱
├── main.jsx        # 엔트리 포인트
└── index.css       # Tailwind 스타일

public/             # 정적 파일
ios/                # iOS 프로젝트
android/            # Android 프로젝트
.github/            # GitHub 설정 (Dependabot)
```

## 자주 쓰는 명령어

```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npm run cap:sync     # 빌드 + Capacitor 동기화
npm run cap:ios      # 빌드 + iOS Xcode 열기
npm run cap:android  # 빌드 + Android Studio 열기
```

## Xcode Cloud 트러블슈팅 (중요!)

### 빌드 실패 시 확인 순서

1. **스키마 공유 여부** (가장 먼저!)
   ```bash
   ls ios/App/App.xcodeproj/xcshareddata/xcschemes/
   ```

2. **Package.resolved 존재 여부**

3. **ci_post_clone.sh 스크립트**

### 필수 파일 (Xcode Cloud)

| 파일 | 상태 |
|------|------|
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | ✅ 생성됨 |
| `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | ✅ 생성됨 |
| `ios/App/ci_scripts/ci_post_clone.sh` | ✅ 생성됨 |

---

## 작업 기록

### 2026-02-03: 프로젝트 생성 및 기초 설정
- Vite 7 + React 19 초기화
- Capacitor 8 설치 및 iOS/Android 플랫폼 추가
- Tailwind CSS 4 설정
- PWA 지원 (vite-plugin-pwa)
- Zustand 상태관리 설정
- 필수 Capacitor 플러그인 설치 (7개)
- 프로젝트 구조 생성 (components, pages, hooks, lib, store, constants)
- Xcode Cloud 필수 파일 생성 (스키마, Package.resolved, ci_post_clone.sh)
- Dependabot 설정
- @ 절대경로 alias 설정
