# DreamSync Runbook

## 문제 발생 시 체크 순서

### 1. 빌드 실패

```bash
# 1. 의존성 확인
npm install

# 2. 캐시 클리어 후 재빌드
rm -rf node_modules/.vite
npm run build

# 3. 타입 에러 확인
npm run typecheck

# 4. 린트 에러 확인
npm run lint
```

### 2. Capacitor 동기화 실패

```bash
# 1. 빌드 먼저 실행
npm run build

# 2. 동기화
npx cap sync

# 3. iOS 특정 문제
cd ios/App && pod install --repo-update && cd ../..

# 4. Android 특정 문제
cd android && ./gradlew clean && cd ..
```

### 3. iOS 빌드 실패

```bash
# 1. 스키마 공유 확인
ls ios/App/App.xcodeproj/xcshareddata/xcschemes/

# 2. Package.resolved 확인
ls ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/

# 3. Xcode 캐시 클리어
rm -rf ~/Library/Developer/Xcode/DerivedData

# 4. Pod 재설치
cd ios/App && rm -rf Pods Podfile.lock && pod install && cd ../..
```

### 4. 데이터 저장 문제

```javascript
// 브라우저 콘솔에서 확인
// Capacitor Preferences 키 목록
import { Preferences } from '@capacitor/preferences';
const { keys } = await Preferences.keys();
console.log(keys);

// 특정 키 값 확인
const { value } = await Preferences.get({ key: 'dreamsync_dreams' });
console.log(JSON.parse(value));
```

### 5. AI 분석 실패

```bash
# 환경변수 확인
echo $VITE_AI  # mock | edge

# Mock 모드로 전환
VITE_AI=mock npm run dev
```

에러 로그 확인:
```javascript
// 브라우저 콘솔
localStorage.getItem('dreamsync_ai_errors');
```

### 6. Feature Flag 문제

```javascript
// 플래그 상태 확인
import useFeatureFlagStore from './store/useFeatureFlagStore';
console.log(useFeatureFlagStore.getState().flags);

// 플래그 강제 설정
useFeatureFlagStore.getState().setFlag('uhs', true);
```

### 7. 테스트 실패

```bash
# 단일 테스트 실행
npm run test -- confidence.test.js

# 테스트 watch 모드
npm run test:watch

# 커버리지 확인
npm run test:coverage
```

## 환경별 설정

### Development

```env
VITE_BACKEND=local
VITE_AI=mock
VITE_ANALYTICS=mock
VITE_FLAGS=local
```

### Staging

```env
VITE_BACKEND=supabase
VITE_AI=edge
VITE_ANALYTICS=mock
VITE_FLAGS=remote
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_EDGE_FUNCTION_URL=https://xxx.supabase.co/functions/v1/ai-proxy
# ⚠️ ANTHROPIC_API_KEY는 Supabase Secrets에만 설정 (VITE_ 접두사 금지)
```

### Production

```env
VITE_BACKEND=supabase
VITE_AI=edge
VITE_ANALYTICS=mixpanel
VITE_FLAGS=remote
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_EDGE_FUNCTION_URL=https://xxx.supabase.co/functions/v1/ai-proxy
VITE_MIXPANEL_TOKEN=xxx
VITE_SENTRY_DSN=xxx
# ⚠️ ANTHROPIC_API_KEY는 Supabase Secrets에만 설정 (VITE_ 접두사 금지)
```

## 모니터링

### 로그 레벨

```javascript
// 콘솔 필터링
[DreamService]  - 꿈 관련
[Forecast]      - 예보 관련
[UHS]           - UHS 관련
[Health]        - HealthKit 관련
[Supabase]      - 백엔드 관련
[Claude]        - AI 관련
```

### 성능 체크포인트

| 작업 | 목표 시간 |
|------|-----------|
| 앱 초기 로딩 | < 2초 |
| 꿈 분석 (Mock) | < 500ms |
| 꿈 분석 (Claude) | < 5초 |
| 체크인 저장 | < 200ms |
| 예보 생성 | < 3초 |

## 데이터 복구

### 로컬 데이터 백업

```javascript
// 전체 데이터 내보내기 (Settings 페이지의 '데이터 내보내기' 기능과 동일)
import useDreamStore from './store/useDreamStore';
import useCheckInStore from './store/useCheckInStore';
import useSymbolStore from './store/useSymbolStore';
import useForecastStore from './store/useForecastStore';

const data = {
  dreams: useDreamStore.getState().dreams,
  checkIns: useCheckInStore.getState().logs,
  symbols: useSymbolStore.getState().symbols,
  forecasts: useForecastStore.getState().forecasts,
};
console.log(JSON.stringify(data, null, 2));
```

### 로컬 데이터 복원

```javascript
// 주의: 기존 데이터 덮어씀
import { Preferences } from '@capacitor/preferences';

const backupData = { /* 백업 JSON */ };
await Preferences.set({
  key: 'dreamsync_dreams',
  value: JSON.stringify(backupData.data.dreams),
});
```

### 데이터 초기화

```javascript
import { Preferences } from '@capacitor/preferences';

// 전체 초기화
await Preferences.clear();

// 특정 스토어만 초기화
await Preferences.remove({ key: 'dreamsync_dreams' });
```

## 긴급 대응

### AI 서비스 장애

```javascript
// src/lib/adapters/ai/edge.js에서 자동 폴백
// Edge Function 실패 시 → Mock으로 전환 (최대 5회)
// 5회 초과 → AI_UNAVAILABLE 에러
// 429 (rate limit) → 즉시 에러 (fallback 안 함)
```

### 스토리지 용량 초과

```javascript
// 오래된 데이터 정리
import useDreamStore from './store/useDreamStore';

const store = useDreamStore.getState();
const oldDreams = store.dreams.filter(
  d => new Date(d.date) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
);
oldDreams.forEach(d => store.removeDream(d.id));
```

### 인증 만료 (Supabase)

```javascript
// 자동 토큰 갱신 실패 시
import { supabase } from './lib/adapters/storage/supabase';
await supabase.auth.signOut();
// 사용자 재로그인 유도
```

## 연락처

- **개발팀**: [GitHub Issues](https://github.com/your-repo/issues)
- **긴급 장애**: 슬랙 #dreamsync-alerts
