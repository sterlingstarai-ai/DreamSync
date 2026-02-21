/**
 * Dashboard 페이지 스모크/핵심 인터랙션 테스트
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const mockState = vi.hoisted(() => ({
  user: { id: 'test-user', name: '테스트', onboardingCompleted: true },
  dreams: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
  todayDreams: [],
  recentDreams: [],
  checkedInToday: false,
  recentLogs: [],
  checkInStats: { completionRate: 0, streak: 0 },
  todayForecast: null,
  yesterdayForecast: null,
  yesterdayLog: null,
  canReviewYesterdayForecast: false,
  isGenerating: false,
  confidence: 0,
  createTodayForecast: vi.fn(),
  reviewYesterdayForecast: vi.fn(),
  toggleTodaySuggestion: vi.fn(),
  getWeeklyProgress: vi.fn(),
  coachPlansByUser: {},
  coachPlan: null,
  getTodayCoachPlan: vi.fn(),
  upsertTodayCoachPlan: vi.fn(),
  toggleCoachTask: vi.fn(),
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
    todayDreams: mockState.todayDreams,
    recentDreams: mockState.recentDreams,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    checkedInToday: mockState.checkedInToday,
    recentLogs: mockState.recentLogs,
    stats: mockState.checkInStats,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useForecast', () => ({
  default: () => ({
    todayForecast: mockState.todayForecast,
    yesterdayForecast: mockState.yesterdayForecast,
    yesterdayLog: mockState.yesterdayLog,
    canReviewYesterdayForecast: mockState.canReviewYesterdayForecast,
    createTodayForecast: mockState.createTodayForecast,
    reviewYesterdayForecast: mockState.reviewYesterdayForecast,
    toggleTodaySuggestion: mockState.toggleTodaySuggestion,
    todayActionProgress: { total: 0, completed: 0, completionRate: 0 },
    isGenerating: mockState.isGenerating,
    confidence: mockState.confidence,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useFeatureFlags', () => ({
  default: () => ({
    isUHSEnabled: false,
  }),
}));

vi.mock('../store/useGoalStore', () => ({
  default: (selector) => {
    const state = {
      getWeeklyProgress: mockState.getWeeklyProgress,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../store/useCoachPlanStore', () => ({
  default: (selector) => {
    const state = {
      plansByUser: mockState.coachPlansByUser,
      getTodayPlan: mockState.getTodayCoachPlan,
      upsertTodayPlan: mockState.upsertTodayCoachPlan,
      toggleTask: mockState.toggleCoachTask,
    };
    return selector ? selector(state) : state;
  },
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
  beforeEach(() => {
    mockState.dreams = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }];
    mockState.todayDreams = [];
    mockState.recentDreams = [];
    mockState.checkedInToday = false;
    mockState.recentLogs = [];
    mockState.checkInStats = { completionRate: 0, streak: 0 };
    mockState.todayForecast = null;
    mockState.yesterdayForecast = null;
    mockState.yesterdayLog = null;
    mockState.canReviewYesterdayForecast = false;
    mockState.isGenerating = false;
    mockState.confidence = 0;
    mockState.createTodayForecast.mockReset();
    mockState.reviewYesterdayForecast.mockReset();
    mockState.toggleTodaySuggestion.mockReset();
    mockState.getWeeklyProgress.mockReset();
    mockState.getWeeklyProgress.mockReturnValue({
      goals: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
      metrics: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
      progress: {
        checkInDays: { achieved: true, target: 5 },
        dreamCount: { achieved: true, target: 4 },
        avgSleepHours: { achieved: true, target: 7 },
      },
    });
    mockState.coachPlansByUser = {};
    mockState.coachPlan = null;
    mockState.getTodayCoachPlan.mockReset();
    mockState.getTodayCoachPlan.mockImplementation(() => mockState.coachPlan);
    mockState.upsertTodayCoachPlan.mockReset();
    mockState.toggleCoachTask.mockReset();
  });

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

  it('should render forecast card placeholder when no forecast and no data', () => {
    renderDashboard();
    expect(screen.getByText('첫 예보를 기다리고 있어요')).toBeInTheDocument();
    expect(screen.getByText('첫 꿈이나 체크인을 기록하면 예보가 시작됩니다')).toBeInTheDocument();
  });

  it('should render beginner guide when dream count is low', () => {
    mockState.dreams = [];
    renderDashboard();

    expect(screen.getByText('다음 단계 가이드')).toBeInTheDocument();
    expect(screen.getByText('최근 활동 요약')).toBeInTheDocument();
    expect(screen.queryByText('이번 주 현황')).not.toBeInTheDocument();
  });

  it('should render pattern alert card when recent pattern is risky', () => {
    mockState.recentLogs = [
      { id: 'l1', date: '2026-02-17', condition: 2, stressLevel: 4, sleep: { duration: 300 } },
      { id: 'l2', date: '2026-02-16', condition: 2, stressLevel: 5, sleep: { duration: 290 } },
      { id: 'l3', date: '2026-02-15', condition: 1, stressLevel: 4, sleep: { duration: 280 } },
    ];

    renderDashboard();
    expect(screen.getByText('복합 악화 신호 감지')).toBeInTheDocument();
  });

  it('should allow quick review for yesterday forecast', async () => {
    mockState.checkInStats = { completionRate: 0, streak: 14 };
    mockState.canReviewYesterdayForecast = true;
    mockState.yesterdayForecast = {
      id: 'f-yesterday',
      prediction: { condition: 4 },
    };
    mockState.yesterdayLog = {
      condition: 3,
      emotions: ['happy'],
    };

    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: '맞았어요' }));

    await waitFor(() => {
      expect(mockState.reviewYesterdayForecast).toHaveBeenCalledTimes(1);
    });
    expect(mockState.reviewYesterdayForecast).toHaveBeenCalledWith({
      outcome: 'hit',
      reasons: ['수면이 좋아서'],
    });
  });

  it('should render coach plan card and toggle a task', () => {
    mockState.coachPlan = {
      date: '2026-02-17',
      tasks: [
        {
          id: 'c1',
          title: '호흡 10분',
          source: 'alert',
          estimatedMinutes: 10,
          completed: false,
        },
      ],
    };

    renderDashboard();
    expect(screen.getByText('오늘 코치 플랜')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /호흡 10분/ }));
    expect(mockState.toggleCoachTask).toHaveBeenCalledWith('test-user', '2026-02-17', 'c1');
  });

  it('shows recovery plan and appends recovery tasks to today plan', async () => {
    mockState.checkInStats = { completionRate: 80, streak: 14 };
    mockState.checkedInToday = true;
    mockState.todayDreams = [{ id: 'd1', content: '꿈', createdAt: '2026-02-17T07:00:00' }];
    mockState.getWeeklyProgress.mockReturnValue({
      goals: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
      metrics: { checkInDays: 2, dreamCount: 1, avgSleepHours: 7 },
      progress: {
        checkInDays: { current: 2, target: 5, achieved: false },
        dreamCount: { current: 1, target: 4, achieved: false },
        avgSleepHours: { current: 7, target: 7, achieved: true },
      },
    });

    renderDashboard();
    expect(screen.getByText('주간 목표 복구 플랜')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '오늘 플랜에 추가' }));
    await waitFor(() => {
      expect(mockState.upsertTodayCoachPlan).toHaveBeenCalledTimes(1);
    });

    const payload = mockState.upsertTodayCoachPlan.mock.calls[0][0];
    expect(payload.userId).toBe('test-user');
    expect(payload.tasks.some(task => task.source === 'recovery')).toBe(true);
  });

  it('deduplicates recovery tasks already in today coach plan', async () => {
    mockState.checkInStats = { completionRate: 70, streak: 14 };
    mockState.checkedInToday = false;
    mockState.todayDreams = [];
    mockState.coachPlan = {
      date: '2026-02-17',
      tasks: [
        {
          id: 'existing-checkin',
          title: '오늘 저녁 체크인 완료하기',
          source: 'goal',
          estimatedMinutes: 3,
          completed: false,
        },
      ],
    };
    mockState.getWeeklyProgress.mockReturnValue({
      goals: { checkInDays: 5, dreamCount: 4, avgSleepHours: 7 },
      metrics: { checkInDays: 2, dreamCount: 1, avgSleepHours: 7 },
      progress: {
        checkInDays: { current: 2, target: 5, achieved: false },
        dreamCount: { current: 1, target: 4, achieved: false },
        avgSleepHours: { current: 7, target: 7, achieved: true },
      },
    });

    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: '오늘 플랜에 추가' }));
    await waitFor(() => {
      expect(mockState.upsertTodayCoachPlan).toHaveBeenCalledTimes(1);
    });

    const payload = mockState.upsertTodayCoachPlan.mock.calls[0][0];
    const checkInTasks = payload.tasks.filter(task => task.title === '오늘 저녁 체크인 완료하기');
    expect(checkInTasks).toHaveLength(1);
  });
});
