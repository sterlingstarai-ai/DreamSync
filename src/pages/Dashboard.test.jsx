/**
 * Dashboard 페이지 스모크 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Mock hooks
vi.mock('../store/useAuthStore', () => ({
  default: () => ({
    user: { id: 'test-user', name: '테스트', onboardingCompleted: true },
  }),
}));

vi.mock('../hooks/useDreams', () => ({
  default: () => ({
    todayDreams: [],
    recentDreams: [],
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    checkedInToday: false,
    stats: { completionRate: 0, streak: 0 },
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useForecast', () => ({
  default: () => ({
    todayForecast: null,
    createTodayForecast: vi.fn(),
    isGenerating: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useFeatureFlags', () => ({
  default: () => ({
    isUHSEnabled: false,
  }),
}));

vi.mock('../lib/utils/date', () => ({
  formatFriendlyDate: (d) => d,
}));

vi.mock('../lib/ai/generateForecast', () => ({
  getConditionLabel: (v) => `조건 ${v}`,
  getConditionColor: () => '#7c3aed',
}));

vi.mock('../lib/scoring', () => ({
  calculateUHS: () => ({ score: 80, breakdown: {}, confidence: 70 }),
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  it('should render user greeting', () => {
    renderDashboard();
    expect(screen.getByText('테스트님')).toBeInTheDocument();
  });

  it('should render quick action cards', () => {
    renderDashboard();
    expect(screen.getByText('꿈 기록하기')).toBeInTheDocument();
    expect(screen.getByText('저녁 체크인')).toBeInTheDocument();
  });

  it('should render stats section', () => {
    renderDashboard();
    expect(screen.getByText('이번 주 현황')).toBeInTheDocument();
    expect(screen.getAllByText(/꿈 기록/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/체크인/).length).toBeGreaterThan(0);
  });

  it('should render forecast card placeholder when no forecast', () => {
    renderDashboard();
    expect(screen.getByText('오늘의 예보 준비 중')).toBeInTheDocument();
  });
});
