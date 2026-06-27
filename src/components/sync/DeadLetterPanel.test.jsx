/**
 * DeadLetterPanel 컴포넌트 테스트 — Q4
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DeadLetterPanel from './DeadLetterPanel';

// syncQueue 전체 모킹
const mockGetDeadLetterItems = vi.fn().mockReturnValue([]);
const mockRetryDeadLetterItem = vi.fn().mockResolvedValue(undefined);
const mockRemoveDeadLetterItem = vi.fn().mockResolvedValue(undefined);
const mockRetryAllDeadLetters = vi.fn().mockResolvedValue(undefined);
const mockClearAllDeadLetters = vi.fn().mockResolvedValue(undefined);
const mockSubscribe = vi.fn().mockReturnValue(() => {});

vi.mock('../../lib/offline/syncQueue', () => ({
  getDeadLetterItems: () => mockGetDeadLetterItems(),
  retryDeadLetterItem: (...args) => mockRetryDeadLetterItem(...args),
  removeDeadLetterItem: (...args) => mockRemoveDeadLetterItem(...args),
  retryAllDeadLetters: () => mockRetryAllDeadLetters(),
  clearAllDeadLetters: () => mockClearAllDeadLetters(),
  subscribe: (cb) => mockSubscribe(cb),
}));

const SAMPLE_ITEMS = [
  {
    id: 'dead-1',
    entity: 'dreams',
    op: 'upsert',
    recordId: 'dream-abc',
    retries: 3,
    lastError: '네트워크 오류',
    deadLetteredAt: new Date('2026-06-27T08:00:00Z').toISOString(),
    createdAt: new Date('2026-06-27T07:00:00Z').toISOString(),
  },
  {
    id: 'dead-2',
    entity: 'daily_logs',
    op: 'upsert',
    recordId: 'log-xyz',
    retries: 3,
    lastError: '서버 응답 없음',
    deadLetteredAt: new Date('2026-06-27T09:00:00Z').toISOString(),
    createdAt: new Date('2026-06-27T07:30:00Z').toISOString(),
  },
];

describe('DeadLetterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeadLetterItems.mockReturnValue([]);
    mockSubscribe.mockReturnValue(() => {});
  });

  it('isOpen=false이면 아무것도 렌더링하지 않음', () => {
    const { container } = render(
      <DeadLetterPanel isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('빈 dead letter에서 empty state 표시', () => {
    mockGetDeadLetterItems.mockReturnValue([]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(
      screen.getByRole('status', { name: /동기화 실패 항목 없음/i })
    ).toBeInTheDocument();
  });

  it('dead letter 항목들을 목록으로 렌더링', () => {
    mockGetDeadLetterItems.mockReturnValue(SAMPLE_ITEMS);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('list', { name: /동기화 실패 항목 목록/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('항목마다 재시도·삭제 버튼이 렌더링됨 (접근성 label 포함)', () => {
    mockGetDeadLetterItems.mockReturnValue([SAMPLE_ITEMS[0]]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: /꿈 기록 재시도/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /꿈 기록 삭제/i })).toBeInTheDocument();
  });

  it('재시도 버튼 클릭 → retryDeadLetterItem(id) 호출', async () => {
    mockGetDeadLetterItems.mockReturnValue([SAMPLE_ITEMS[0]]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /꿈 기록 재시도/i }));
    });

    expect(mockRetryDeadLetterItem).toHaveBeenCalledWith('dead-1');
  });

  it('삭제 버튼 클릭 → removeDeadLetterItem(id) 호출', async () => {
    mockGetDeadLetterItems.mockReturnValue([SAMPLE_ITEMS[0]]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /꿈 기록 삭제/i }));
    });

    expect(mockRemoveDeadLetterItem).toHaveBeenCalledWith('dead-1');
  });

  it('항목이 있으면 "전체 재시도" 버튼 표시', () => {
    mockGetDeadLetterItems.mockReturnValue(SAMPLE_ITEMS);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: /전체 재시도/i })).toBeInTheDocument();
  });

  it('전체 재시도 클릭 → retryAllDeadLetters 호출', async () => {
    mockGetDeadLetterItems.mockReturnValue(SAMPLE_ITEMS);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /전체 재시도/i }));
    });

    expect(mockRetryAllDeadLetters).toHaveBeenCalled();
  });

  it('전체 삭제 클릭 → clearAllDeadLetters 호출', async () => {
    mockGetDeadLetterItems.mockReturnValue(SAMPLE_ITEMS);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /전체 삭제/i }));
    });

    expect(mockClearAllDeadLetters).toHaveBeenCalled();
  });

  it('오류 메시지가 항목에 표시됨', () => {
    mockGetDeadLetterItems.mockReturnValue([SAMPLE_ITEMS[0]]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
  });

  it('subscribe 구독 후 unmount 시 구독 해제', () => {
    const unsubFn = vi.fn();
    mockSubscribe.mockReturnValue(unsubFn);

    const { unmount } = render(
      <DeadLetterPanel isOpen={true} onClose={() => {}} />
    );

    unmount();

    expect(unsubFn).toHaveBeenCalled();
  });

  it('빈 dead letter에서는 "전체 재시도" 버튼이 표시되지 않음', () => {
    mockGetDeadLetterItems.mockReturnValue([]);

    render(<DeadLetterPanel isOpen={true} onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /전체 재시도/i })).not.toBeInTheDocument();
  });
});
