/**
 * CheckIn 페이지 스모크 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckIn from './CheckIn';

const {
  mockSubmitCheckIn,
  mockClearError,
  mockRecordActualFromCheckIn,
  mockSetSleepSummary,
  mockGetTodaySummary,
  healthkitEnabledState,
} = vi.hoisted(() => ({
  mockSubmitCheckIn: vi.fn(),
  mockClearError: vi.fn(),
  mockRecordActualFromCheckIn: vi.fn(),
  mockSetSleepSummary: vi.fn(),
  mockGetTodaySummary: vi.fn(),
  healthkitEnabledState: { value: false },
}));

// Mock hooks
vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    checkedInToday: false,
    todayLog: null,
    submitCheckIn: mockSubmitCheckIn,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

vi.mock('../hooks/useForecast', () => ({
  default: () => ({
    recordActualFromCheckIn: mockRecordActualFromCheckIn,
  }),
}));

vi.mock('../hooks/useFeatureFlags', () => ({
  default: () => ({
    isEnabled: (key) => key === 'healthkit' && healthkitEnabledState.value,
  }),
}));

vi.mock('../store/useSleepStore', () => ({
  default: (selector) => selector({
    getTodaySummary: mockGetTodaySummary,
    setSleepSummary: mockSetSleepSummary,
  }),
}));

vi.mock('../components/common', () => ({
  PageContainer: ({ children, className }) => <div className={className}>{children}</div>,
  PageHeader: ({ title, subtitle }) => <div><h1>{title}</h1><p>{subtitle}</p></div>,
  Card: ({ children, className, onClick }) => <div className={className} onClick={onClick}>{children}</div>,
  Button: ({ children, onClick, disabled, loading, _fullWidth, _variant }) => (
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../constants/emotions', () => ({
  EMOTIONS: [
    { id: 'happy', name: '행복', emoji: '😊', color: '#10b981', category: 'positive' },
    { id: 'sad', name: '슬픔', emoji: '😢', color: '#3b82f6', category: 'negative' },
  ],
  getEmotionById: (id) => ({ id, name: id, emoji: '😊', color: '#10b981' }),
}));

vi.mock('../constants/events', () => ({
  EVENTS: [],
  getEventsByCategory: () => ({}),
  EVENT_CATEGORIES: {},
}));

function renderCheckIn() {
  return render(
    <MemoryRouter>
      <CheckIn />
    </MemoryRouter>
  );
}

describe('CheckIn', () => {
  beforeEach(() => {
    healthkitEnabledState.value = false;
    mockSubmitCheckIn.mockReset();
    mockSubmitCheckIn.mockResolvedValue(true);
    mockClearError.mockReset();
    mockRecordActualFromCheckIn.mockReset();
    mockSetSleepSummary.mockReset();
    mockGetTodaySummary.mockReset();
    mockGetTodaySummary.mockReturnValue(undefined);
  });

  it('should render check-in form with first step', () => {
    renderCheckIn();
    expect(screen.getByText('저녁 체크인')).toBeInTheDocument();
    expect(screen.getByText('오늘 컨디션은 어땠나요?')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    renderCheckIn();
    expect(screen.getByText('단계 1/4')).toBeInTheDocument();
  });

  it('should display condition options', () => {
    renderCheckIn();
    expect(screen.getByText('최악')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
    expect(screen.getByText('최고')).toBeInTheDocument();
  });

  it('should navigate to next step on button click', async () => {
    renderCheckIn();
    const nextButton = screen.getByText('다음');
    fireEvent.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText('오늘 느낀 감정을 선택해주세요')).toBeInTheDocument();
    });
  });

  it('should preserve wearable snapshot when editing only one sleep field', async () => {
    healthkitEnabledState.value = true;
    mockGetTodaySummary.mockReturnValue({
      totalSleepMinutes: 510,
      sleepQualityScore: 8,
      bedTime: '23:30',
      wakeTime: '08:00',
      source: 'healthkit',
    });

    renderCheckIn();
    fireEvent.click(screen.getByText('다음'));
    await screen.findByText('오늘 느낀 감정을 선택해주세요');
    fireEvent.click(screen.getByRole('button', { name: '감정 행복' }));
    fireEvent.click(screen.getByText('다음'));
    await screen.findByText('오늘 스트레스는 어땠나요?');
    fireEvent.click(screen.getByText('다음'));

    await waitFor(() => {
      expect(screen.getByText('어젯밤 수면은 어땠나요?')).toBeInTheDocument();
    });

    const bedTimeInput = screen.getByLabelText('취침 시간');
    expect(bedTimeInput).toHaveValue('23:30');
    expect(screen.getByLabelText('기상 시간')).toHaveValue('08:00');

    fireEvent.change(bedTimeInput, { target: { value: '22:30' } });

    fireEvent.click(screen.getByText('다음'));
    await screen.findByText('체크인 완료');
    fireEvent.click(screen.getByText('체크인 완료'));

    await waitFor(() => {
      expect(mockSubmitCheckIn).toHaveBeenCalledTimes(1);
    });

    const submitted = mockSubmitCheckIn.mock.calls[0][0];
    expect(submitted.sleep).toMatchObject({
      bedTime: '22:30',
      wakeTime: '08:00',
      quality: 4,
      source: 'manual',
    });
  });
});
