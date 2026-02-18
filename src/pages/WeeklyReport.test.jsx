/**
 * WeeklyReport 페이지 테스트
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WeeklyReport from './WeeklyReport';

const mockState = vi.hoisted(() => ({
  user: { id: 'user-1', name: '테스터', onboardingCompleted: true },
  recentDreams: [],
  dreams: [],
  symbols: [],
  recentLogs: [],
  logs: [],
  checkInStats: { completionRate: 0, averageCondition: 0, streak: 0 },
  forecastStats: { averageAccuracy: 0 },
  experimentSummary: {
    sampleSize: 0,
    highCompletionDays: 0,
    lowCompletionDays: 0,
    avgConditionHighCompletion: 0,
    avgConditionLowCompletion: 0,
    improvement: 0,
  },
  getWeeklyProgress: vi.fn(),
  updateGoals: vi.fn(),
  getSuggestedGoals: vi.fn(),
  applySuggestedGoals: vi.fn(),
  coachPlansByUser: {},
  getRecentPlanStats: vi.fn(),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => {
    const state = { user: mockState.user };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../hooks/useDreams', () => ({
  default: () => ({
    dreams: mockState.dreams,
    recentDreams: mockState.recentDreams,
    symbols: mockState.symbols,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    logs: mockState.logs,
    recentLogs: mockState.recentLogs,
    stats: mockState.checkInStats,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useForecast', () => ({
  default: () => ({
    stats: mockState.forecastStats,
    experimentSummary: mockState.experimentSummary,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../store/useGoalStore', () => {
  const store = (selector) => {
    const state = {
      getWeeklyProgress: mockState.getWeeklyProgress,
      updateGoals: mockState.updateGoals,
      getSuggestedGoals: mockState.getSuggestedGoals,
      applySuggestedGoals: mockState.applySuggestedGoals,
    };
    return selector ? selector(state) : state;
  };
  store.getState = () => ({
    getWeeklyProgress: mockState.getWeeklyProgress,
    updateGoals: mockState.updateGoals,
    getSuggestedGoals: mockState.getSuggestedGoals,
    applySuggestedGoals: mockState.applySuggestedGoals,
  });
  return { default: store };
});

vi.mock('../store/useCoachPlanStore', () => {
  const store = (selector) => {
    const state = {
      plansByUser: mockState.coachPlansByUser,
      getRecentPlanStats: mockState.getRecentPlanStats,
    };
    return selector ? selector(state) : state;
  };
  store.getState = () => ({
    plansByUser: mockState.coachPlansByUser,
    getRecentPlanStats: mockState.getRecentPlanStats,
  });
  return { default: store };
});

vi.mock('../components/common', () => ({
  PageContainer: ({ children, className }) => <div className={className}>{children}</div>,
  PageHeader: ({ title, subtitle, rightAction }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {rightAction}
    </div>
  ),
  Card: ({ children }) => <div>{children}</div>,
  EmptyState: ({ title, description }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  useToast: () => ({
    success: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../components/common/BottomNav', () => ({
  default: () => null,
}));

function renderWeeklyReport() {
  return render(
    <MemoryRouter>
      <WeeklyReport />
    </MemoryRouter>
  );
}

describe('WeeklyReport', () => {
  beforeEach(() => {
    mockState.recentDreams = [
      { id: 'd1', date: '2026-02-17', content: '바다 꿈' },
      { id: 'd2', date: '2026-02-16', content: '숲 꿈' },
      { id: 'd3', date: '2026-02-15', content: '학교 꿈' },
      { id: 'd4', date: '2026-02-14', content: '집 꿈' },
    ];
    mockState.dreams = [...mockState.recentDreams];
    mockState.symbols = [
      { name: '바다', count: 3 },
      { name: '숲', count: 2 },
    ];
    mockState.recentLogs = [
      { date: '2026-02-17', condition: 4, stressLevel: 2, emotions: ['happy'], sleep: { duration: 480 } },
      { date: '2026-02-16', condition: 3, stressLevel: 3, emotions: ['happy'], sleep: { duration: 450 } },
      { date: '2026-02-15', condition: 4, stressLevel: 2, emotions: ['calm'], sleep: { duration: 420 } },
    ];
    mockState.logs = [...mockState.recentLogs];
    mockState.checkInStats = { completionRate: 86, averageCondition: 3.7, streak: 3 };
    mockState.forecastStats = { averageAccuracy: 72 };
    mockState.experimentSummary = {
      sampleSize: 4,
      highCompletionDays: 2,
      lowCompletionDays: 2,
      avgConditionHighCompletion: 4.3,
      avgConditionLowCompletion: 3.1,
      improvement: 1.2,
    };
    mockState.getWeeklyProgress.mockReset();
    mockState.updateGoals.mockReset();
    mockState.getSuggestedGoals.mockReset();
    mockState.applySuggestedGoals.mockReset();
    mockState.getRecentPlanStats.mockReset();
    mockState.getWeeklyProgress.mockReturnValue({
      goals: {
        checkInDays: 5,
        dreamCount: 4,
        avgSleepHours: 7,
      },
      metrics: {
        checkInDays: 3,
        dreamCount: 4,
        avgSleepHours: 7.5,
      },
      progress: {
        checkInDays: { current: 3, target: 5, rate: 60, achieved: false },
        dreamCount: { current: 4, target: 4, rate: 100, achieved: true },
        avgSleepHours: { current: 7.5, target: 7, rate: 100, achieved: true },
      },
    });
    mockState.getSuggestedGoals.mockReturnValue({
      current: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
      suggested: { checkInDays: 6, dreamCount: 5, avgSleepHours: 7.3 },
      basis: { lookbackDays: 14 },
      confidence: 'medium',
    });
    mockState.applySuggestedGoals.mockReturnValue({
      checkInDays: 6,
      dreamCount: 5,
      avgSleepHours: 7.3,
    });
    mockState.getRecentPlanStats.mockReturnValue({
      days: 7,
      activeDays: 3,
      totalTasks: 9,
      completedTasks: 6,
      completionRate: 67,
    });
  });

  it('renders goal and experiment sections', () => {
    renderWeeklyReport();

    expect(screen.getByText('주간 코치 목표')).toBeInTheDocument();
    expect(screen.getByText('행동 실험 결과')).toBeInTheDocument();
    expect(screen.getByText('코치 플랜 이행률')).toBeInTheDocument();
    expect(screen.getByText(/추천 목표/)).toBeInTheDocument();
    expect(screen.getByText('2/3 달성')).toBeInTheDocument();
    expect(screen.getByText(/추천 행동을 절반 이상 실천한 날/)).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('updates weekly goal when pressing increment button', () => {
    renderWeeklyReport();
    fireEvent.click(screen.getByLabelText('체크인 목표 높이기'));

    expect(mockState.updateGoals).toHaveBeenCalledTimes(1);
    expect(mockState.updateGoals).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        checkInDays: 6,
        dreamCount: 4,
        avgSleepHours: 7,
      }),
    );
  });

  it('applies suggested goals when clicking recommendation button', () => {
    renderWeeklyReport();
    fireEvent.click(screen.getByText('추천 적용'));
    expect(mockState.applySuggestedGoals).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ lookbackDays: 14 }),
    );
  });

  it('shows guidance text when experiment data is not enough', () => {
    mockState.experimentSummary = {
      sampleSize: 0,
      highCompletionDays: 0,
      lowCompletionDays: 0,
      avgConditionHighCompletion: 0,
      avgConditionLowCompletion: 0,
      improvement: 0,
    };

    renderWeeklyReport();
    expect(screen.getByText('아직 실험 데이터가 부족해요. 대시보드에서 추천 행동을 체크해보세요.')).toBeInTheDocument();
  });
});
