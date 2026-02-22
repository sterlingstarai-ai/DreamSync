/**
 * TimelineSearch 페이지 테스트
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TimelineSearch from './TimelineSearch';

const mockData = vi.hoisted(() => ({
  dreams: [],
  logs: [],
  symbols: [],
}));

vi.mock('../hooks/useDreams', () => ({
  default: () => ({
    dreams: mockData.dreams,
  }),
}));

vi.mock('../hooks/useCheckIn', () => ({
  default: () => ({
    logs: mockData.logs,
  }),
}));

vi.mock('../hooks/useSymbols', () => ({
  default: () => ({
    symbols: mockData.symbols,
  }),
}));

vi.mock('../components/common', () => ({
  PageContainer: ({ children, className }) => <div className={className}>{children}</div>,
  PageHeader: ({ title, subtitle, leftAction }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {leftAction}
    </div>
  ),
  Card: ({ children, onClick }) => <div onClick={onClick}>{children}</div>,
  Input: ({ value, onChange, placeholder }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
  EmptyState: ({ title, description }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../components/common/BottomNav', () => ({
  default: () => null,
}));

vi.mock('../lib/utils/date', () => ({
  formatFriendlyDate: (value) => value,
  getTodayString: () => '2026-02-17',
}));

function renderTimelineSearch() {
  return render(
    <MemoryRouter>
      <TimelineSearch />
    </MemoryRouter>
  );
}

describe('TimelineSearch', () => {
  beforeEach(() => {
    mockData.dreams = [
      {
        id: 'd1',
        date: '2026-02-17',
        content: '바다에서 수영하는 꿈',
        analysis: {
          symbols: [{ name: '바다', meaning: '회복' }],
          emotions: [{ id: 'happy', name: '행복한' }],
          themes: ['평온'],
        },
      },
      {
        id: 'd2',
        date: '2026-02-16',
        content: '어두운 터널을 계속 도망쳤다',
        analysis: {
          symbols: [{ name: '터널', meaning: '압박' }],
          emotions: [{ id: 'anxious', name: '불안한' }],
          themes: ['불안'],
        },
      },
    ];

    mockData.logs = [
      {
        id: 'l1',
        date: '2026-02-17',
        condition: 4,
        stressLevel: 2,
        emotions: ['happy'],
        events: [],
        note: '산책하고 기분이 좋았다',
      },
      {
        id: 'l2',
        date: '2026-02-16',
        condition: 2,
        stressLevel: 4,
        emotions: ['anxious'],
        events: [],
        note: '회의가 길어 피곤했다',
      },
    ];

    mockData.symbols = [
      { name: '바다', count: 4 },
      { name: '터널', count: 2 },
    ];
  });

  it('renders merged timeline results', () => {
    renderTimelineSearch();

    expect(screen.getByText('통합 검색')).toBeInTheDocument();
    expect(screen.getByText('4건')).toBeInTheDocument();
    expect(screen.getByText('바다에서 수영하는 꿈')).toBeInTheDocument();
    expect(screen.getByText(/컨디션 4\/5/)).toBeInTheDocument();
  });

  it('filters timeline by keyword', () => {
    renderTimelineSearch();

    fireEvent.change(screen.getByPlaceholderText('키워드 검색 (꿈 내용, 이벤트, 심볼...)'), {
      target: { value: '터널' },
    });

    expect(screen.getByText('1건')).toBeInTheDocument();
    expect(screen.getByText('어두운 터널을 계속 도망쳤다')).toBeInTheDocument();
    expect(screen.queryByText('바다에서 수영하는 꿈')).not.toBeInTheDocument();
  });

  it('filters timeline by symbol', () => {
    renderTimelineSearch();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '바다' } });

    expect(screen.getByText('1건')).toBeInTheDocument();
    expect(screen.getByText('바다에서 수영하는 꿈')).toBeInTheDocument();
    expect(screen.queryByText(/컨디션 4\/5/)).not.toBeInTheDocument();
  });
});
