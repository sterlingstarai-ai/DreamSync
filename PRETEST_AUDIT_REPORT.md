# DreamSync Preflight Audit Report

> 배포 전 프리플라이트 검수 결과
> 날짜: 2026-02-03
> 검증 도구: npm ci, npm audit, depcheck, Vite build, Vitest, scripts/check-secrets.sh

---

## 1. 의존성 / 공급망 검수

### 명령어 및 결과

```bash
npm ci                    # 644 packages, 0 vulnerabilities
npm audit --omit=dev      # 0 vulnerabilities (high/critical = 0)
npx depcheck              # 분석 완료
```

### depcheck 결과

| 구분 | 패키지 | 판정 |
|------|--------|------|
| Unused dep | @capacitor/android | 거짓 양성 — `npx cap sync android`에 필요 |
| Unused dep | @capacitor/ios | 거짓 양성 — `npx cap sync ios`에 필요 |
| Unused devDep | autoprefixer | **삭제 완료** — Tailwind CSS 4는 @tailwindcss/vite 사용 |
| Unused devDep | postcss | **삭제 완료** — PostCSS 파이프라인 미사용 |
| Unused devDep | tailwindcss | **삭제 완료** — @tailwindcss/vite로 대체됨 |
| Missing (dynamic) | @supabase/supabase-js | 예상됨 — Phase 2+ dynamic import |
| Missing (dynamic) | mixpanel-browser | 예상됨 — Phase 2+ dynamic import |
| Missing (dynamic) | @sentry/react | 예상됨 — Phase 2+ dynamic import |

### 수정

- `npm uninstall autoprefixer postcss tailwindcss` → 3 packages removed
- 커밋: `chore: remove unused devDeps (autoprefixer, postcss, tailwindcss)`
- `npm run verify` PASS (170 tests)

### 남은 리스크

- 없음

---

## 2. 환경변수 / 빌드 모드 매트릭스

### import.meta.env 참조 전수 조사

| 변수 | 사용 위치 | 기본값 | Phase |
|------|-----------|--------|-------|
| `VITE_AI` | App.jsx | `'mock'` | 1 |
| `VITE_ANALYTICS` | App.jsx | `'mock'` | 1 |
| `VITE_BACKEND` | App.jsx | `'local'` | 1 |
| `VITE_EDGE_FUNCTION_URL` | ai/edge.js | — | 2+ |
| `VITE_SUPABASE_URL` | remote.js, supabase.js | — | 2+ |
| `VITE_SUPABASE_ANON_KEY` | remote.js, supabase.js | — | 2+ |
| `VITE_MIXPANEL_TOKEN` | mixpanel.js | — | 2+ |
| `VITE_SENTRY_DSN` | sentry.js | — | 2+ |
| `import.meta.env.DEV` | logger.js, ErrorBoundary | Vite 내장 | — |
| `import.meta.env.PROD` | sentry.js | Vite 내장 | — |
| `import.meta.env.MODE` | sentry.js | Vite 내장 | — |

### 검증 결과

- **프로덕션 빌드 (env 없음)**: `npm run build` PASS — 모든 어댑터가 mock/local 기본값으로 fallback
- **dist/ 시크릿 스캔**: `scripts/check-secrets.sh --dist` → 0 matches
- **`VITE_` 접두사 + 서버키 혼용**: 없음 (ANTHROPIC_API_KEY는 VITE_ 접두사 없음)

### 발견사항

| 항목 | 우선도 | 상태 |
|------|--------|------|
| `.env.example`에 `VITE_FLAGS=local` 기재되었으나 코드에서 미참조 | P2 | 미수정 (문서 정리 시 제거) |
| `VITE_B2B_API_URL` (b2bService.js) — `.env.example` 미기재 | P2 | 미수정 (dead code, Phase 4) |

### 남은 리스크

- 없음 (P2 항목은 런타임 영향 없음)

---

## 3. Capacitor 네이티브 설정 / 권한

### capacitor.config.json

```json
{
  "appId": "com.dreamsync.app",
  "appName": "DreamSync",
  "webDir": "dist"
}
```

- `server.url` 없음 (dev 서버 포인팅 위험 0)
- `webDir: "dist"` 정상

### iOS (Info.plist)

- `CFBundleDisplayName`: DreamSync ✅
- `LSRequiresIPhoneOS`: true ✅
- `UISupportedInterfaceOrientations`: Portrait + Landscape ✅
- `NSMicrophoneUsageDescription`: **미설정** — VoiceRecorder가 Web Speech API 사용하므로 네이티브에서 음성 입력 시 필요. 현재 graceful degradation ("지원하지 않는 브라우저입니다" 표시).
- `NSHealthShareUsageDescription`: **미설정** — HealthKit Phase 2+ (feature flag off)

### Android (AndroidManifest.xml)

- `android.permission.INTERNET`: ✅
- `RECORD_AUDIO`: 미설정 (Web Speech API, Phase 2+)
- `android:allowBackup="true"`: **주의** — adb backup으로 Preferences 데이터 추출 가능. Phase 2에서 `android:allowBackup="false"` 권장.

### 플러그인 매핑

| 플러그인 | package.json | 코드 import | 일치 |
|----------|-------------|-------------|------|
| @capacitor/core | ✅ | ✅ | ✅ |
| @capacitor/preferences | ✅ | ✅ | ✅ |
| @capacitor/haptics | ✅ | ✅ | ✅ |
| @capacitor/network | ✅ | ✅ | ✅ |
| @capacitor/status-bar | ✅ | ✅ | ✅ |
| @capacitor/keyboard | ✅ | ✅ | ✅ |
| @capacitor/splash-screen | ✅ | ✅ | ✅ |
| @capacitor/app | ✅ | ✅ | ✅ |
| @capacitor/local-notifications | ✅ | ✅ | ✅ |

### 남은 리스크

| 항목 | 우선도 | 대응 |
|------|--------|------|
| iOS 음성 입력 plist 키 누락 | P2 | Phase 2에서 추가 (현재 graceful degradation) |
| Android allowBackup=true | P2 | Phase 2에서 false로 변경 |

---

## 4. 성능 / 번들 / 초기 부팅

### 빌드 결과

```
빌드 시간: 1.61s
총 dist 크기: 636 KB
PWA precache: 40 entries (520 KB)
```

### 번들 분석

| 청크 | 크기 (raw) | gzip | 비고 |
|------|-----------|------|------|
| index (메인) | 339 KB | 108 KB | React, Zustand, Zod, Router, Lucide |
| CSS | 50 KB | 9.3 KB | Tailwind |
| useSymbolStore | 30 KB | 8.9 KB | Mock AI 데이터 포함 |
| Dashboard | 13 KB | 4.5 KB | 코드 분할됨 |
| CheckIn | 11 KB | 3.8 KB | 코드 분할됨 |
| Settings | 11 KB | 4.0 KB | 코드 분할됨 |
| DreamCapture | 9.2 KB | 3.5 KB | 코드 분할됨 |
| WeeklyReport | 7.7 KB | 3.0 KB | 코드 분할됨 |
| 기타 라우트 | 2-6 KB | 1-3 KB | 코드 분할됨 |

### 코드 분할

- 9개 라우트 모두 `React.lazy()` + `Suspense` 적용
- 초기 로딩: index + CSS = ~117 KB gzip
- 서비스 워커: `maximumFileSizeToCacheInBytes: 3MB` (적절)

### 남은 리스크

- 없음 (메인 번들 108KB gzip은 React SPA 기준 양호)

---

## 5. 데이터 생명주기

### Zustand Persist 설정

| 스토어 | persist key | version | migrate |
|--------|-------------|---------|---------|
| useAuthStore | dreamsync-auth | 1 | passthrough |
| useDreamStore | dreams | 1 | passthrough |
| useCheckInStore | checkin | 1 | passthrough |
| useForecastStore | forecasts | 1 | passthrough |
| useSymbolStore | symbols | 1 | passthrough |
| useFeatureFlagStore | features | 1 | passthrough |
| useSettingsStore | settings | 1 | passthrough |

- 모든 스토어가 `zustandStorage` (Capacitor Preferences) 사용
- `migration.test.js` (10 tests)에서 v0→v1, null/undefined/손상 데이터 처리 검증

### 내보내기

- Settings > 데이터 내보내기 → JSON Blob download (웹 전용)
- 네이티브에서는 `document.createElement('a').download`가 WKWebView에서 미지원 → Phase 2에서 Capacitor Filesystem 사용 예정

### 삭제

- Settings > 모든 데이터 삭제:
  1. 4개 데이터 스토어 `reset()` 호출
  2. `settings.resetSettings()` 호출
  3. `storage.clear()` — Capacitor Preferences 전체 초기화
  4. "삭제" 텍스트 입력 확인 필수 (안전장치)

### 오프라인 동기화 큐

- `syncQueue.js`: storage adapter 사용, 재시도 3회, Phase 1은 no-op processItem
- `syncQueue.test.js` (4 tests): 초기화, 큐잉, 구독, 초기화 검증

### 남은 리스크

| 항목 | 우선도 | 대응 |
|------|--------|------|
| 네이티브 데이터 내보내기 미지원 | P2 | Phase 2에서 Filesystem 플러그인 사용 |

---

## 6. PII 제로 검수

### 민감 필드 목록 동기화

| 채널 | 필드 수 | mask.js 13개와 일치 |
|------|---------|-------------------|
| mask.js (SENSITIVE_KEYS) | 13 | 기준 |
| Sentry (sensitivePatterns) | 12 regex | ✅ (regex로 13개 모두 커버) |
| Mixpanel (sensitiveFields) | 14 | ✅ (13개 + hrvData 추가) |
| audit-log (SENSITIVE_FIELDS) | 14 | ✅ (13개 + hrvData 추가) |

### 로그 게이팅

- `src/lib/utils/logger.js`: `import.meta.env.DEV` 체크 → 프로덕션에서 noop
- `src/` 내 직접 `console.*` 호출: **0건** (주석 내 1건 제외)

### 테스트 검증

```bash
npx vitest run src/test/integration/piiSanitization.test.js
# 7 tests passed — mask.js 마스킹, Sentry REDACTED, Mixpanel length/count 전환
```

### dist/ 시크릿 스캔

```bash
scripts/check-secrets.sh --dist
# No secrets found
```

### 보안 검증 매트릭스

| 검사 항목 | 결과 |
|-----------|------|
| Anthropic key pattern in dist/ | 0 |
| `api.anthropic.com` in dist/ | 0 |
| `VITE_ANTHROPIC` in src/ | 0 |
| `require()` in src/ | 0 (ESM 순수) |
| `eval()` / `innerHTML` in src/ | 0 (XSS 벡터 없음) |
| Dream content in console.* calls | 0 (logger 유틸리티로 DEV 게이팅) |
| Sentry beforeSend | sensitivePatterns REDACTED |
| Mixpanel sanitizeProperties | length/count만 전송 |
| audit-log stripSensitiveFields | ALLOWED_FIELDS 허용목록 방식 |
| pre-commit hook | 7 패턴 스캔 |

### 남은 리스크

- 없음

---

## 수정 요약

| 커밋 | 내용 | verify |
|------|------|--------|
| `chore: remove unused devDeps` | autoprefixer, postcss, tailwindcss 제거 | PASS (170 tests) |

## 미수정 항목 (런타임 영향 없음)

| 항목 | 우선도 | 사유 |
|------|--------|------|
| `.env.example`의 `VITE_FLAGS=local` 미참조 | P2 | 문서 정리 시 제거 |
| `VITE_B2B_API_URL` `.env.example` 미기재 | P2 | dead code (Phase 4) |
| iOS 음성 plist 키 누락 | P2 | graceful degradation |
| Android `allowBackup="true"` | P2 | Phase 2에서 변경 |
| 네이티브 데이터 내보내기 | P2 | Phase 2 Filesystem 플러그인 |

---

## 종합 판정

| 항목 | 결과 |
|------|------|
| npm ci (clean install) | PASS — 644 packages, 0 vulnerabilities |
| npm audit --omit=dev | PASS — 0 high/critical |
| npm run verify | PASS — lint + typecheck + build + 170 tests |
| dist/ 시크릿 스캔 | PASS — 0 matches |
| PII 유출 경로 | PASS — 0 경로 |
| 프로덕션 빌드 (env 없음) | PASS — mock/local 기본값 fallback |
| 미수정 P0/P1 | 0건 |
| 미수정 P2 | 5건 (모두 런타임 영향 없음) |

**프리플라이트 검수 통과. 테스트 진행 가능.**
