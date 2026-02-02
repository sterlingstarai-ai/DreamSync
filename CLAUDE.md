# DreamSync 프로젝트 컨텍스트

> Claude Code가 이 프로젝트를 빠르게 이해하기 위한 메모리 파일

## 프로젝트 개요

**DreamSync** - React + Capacitor 하이브리드 앱

- **타입**: React PWA + Capacitor 네이티브 앱 (iOS/Android)
- **버전**: 0.0.1
- **상태**: 초기 설정 완료

## 기술 스택

```
React 19 + Vite 7
Capacitor 8 (iOS/Android)
```

## 주요 설정값

| 항목 | 값 |
|------|-----|
| App ID | `com.dreamsync.app` |
| Web Dir | `dist` |

## 폴더 구조

```
src/
├── App.jsx         # 메인 앱 컴포넌트
├── App.css         # 앱 스타일
├── main.jsx        # 엔트리 포인트
└── index.css       # 글로벌 스타일

public/             # 정적 파일
ios/                # Capacitor iOS 프로젝트
android/            # Capacitor Android 프로젝트
```

## 자주 쓰는 명령어

```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npx cap sync         # 네이티브 프로젝트 동기화
npx cap open ios     # Xcode 열기
npx cap open android # Android Studio 열기
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

| 파일 | 용도 |
|------|------|
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | 공유 스키마 (필수!) |
| `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | SPM 의존성 |
| `ios/App/ci_scripts/ci_post_clone.sh` | 빌드 전 스크립트 |

---

## 작업 기록

### 2026-02-03: 프로젝트 생성
- Vite + React 초기화
- Capacitor 8 설치 및 iOS/Android 플랫폼 추가
- Git 저장소 초기화
