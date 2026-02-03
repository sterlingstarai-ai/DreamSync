/**
 * CheckIn 페이지 스모크 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckIn from './CheckIn';

// Mock hooks
vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    checkedInToday: false,
    todayLog: null,
    submitCheckIn: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useForecast', () => ({
  default: () => ({
    recordActualFromCheckIn: vi.fn(),
  }),
}));

vi.mock('../components/common', () => ({
  PageContainer: ({ children, className }) => <div className={className}>{children}</div>,
  PageHeader: ({ title, subtitle }) => <div><h1>{title}</h1><p>{subtitle}</p></div>,
  Card: ({ children, className, onClick }) => <div className={className} onClick={onClick}>{children}</div>,
  Button: ({ children, onClick, disabled, loading, fullWidth, variant }) => (
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
});
