/**
 * 앱 라우터 설정
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';

// 페이지 컴포넌트 (lazy loading 가능)
import Dashboard from './pages/Dashboard';
import DreamCapture from './pages/DreamCapture';
import CheckIn from './pages/CheckIn';
import WeeklyReport from './pages/WeeklyReport';
import SymbolDictionary from './pages/SymbolDictionary';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';

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

export default function Router() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
