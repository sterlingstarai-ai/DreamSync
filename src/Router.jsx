/**
 * 앱 라우터 설정
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import useAuthStore from './store/useAuthStore';
import useNetworkStatus from './hooks/useNetworkStatus';
import { PageLoading } from './components/common/Loading';

// Lazy-loaded 페이지 컴포넌트
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DreamCapture = lazy(() => import('./pages/DreamCapture'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'));
const SymbolDictionary = lazy(() => import('./pages/SymbolDictionary'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup'));

/**
 * 인증 필요 라우트 래퍼
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 온보딩 미완료 시 온보딩 페이지로
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

/**
 * 비인증 사용자 전용 라우트
 */
function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    // 온보딩 미완료 시 온보딩으로
    if (user && !user.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * 온보딩 라우트 (인증 필요, 온보딩 완료 시 대시보드로)
 */
function OnboardingRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.onboardingCompleted) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * 오프라인 표시 배너
 */
function OfflineBanner() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center py-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
      <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
      오프라인 모드 - 데이터는 자동 저장됩니다
    </div>
  );
}

export default function Router() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Suspense fallback={<PageLoading message="페이지 로딩 중..." />}>
        <Routes>
          {/* 공개 라우트 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* 온보딩 */}
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <Onboarding />
              </OnboardingRoute>
            }
          />

          {/* 보호된 라우트 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dream"
            element={
              <ProtectedRoute>
                <DreamCapture />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin"
            element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <WeeklyReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/symbols"
            element={
              <ProtectedRoute>
                <SymbolDictionary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* 404 - 대시보드로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
