/**
 * DreamCapture 페이지 스모크 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast';
import DreamCapture from './DreamCapture';

// Mock hooks
vi.mock('../hooks/useDreams', () => ({
  default: () => ({
    dreams: [],
    todayDreams: [],
    isLoading: false,
    isAnalyzing: false,
    error: null,
    clearError: vi.fn(),
    createDream: vi.fn(),
    getDreamById: vi.fn(),
  }),
}));

vi.mock('../hooks/useVoiceInput', () => ({
  default: () => ({
    isSupported: false,
    isListening: false,
    fullTranscript: '',
    toggleListening: vi.fn(),
    clearTranscript: vi.fn(),
    error: null,
  }),
}));

vi.mock('../lib/utils/date', () => ({
  formatFriendlyDate: (d) => d,
}));

vi.mock('../lib/ai/analyzeDream', () => ({
  getIntensityLabel: (v) => `강도 ${v}`,
}));

function renderDreamCapture() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DreamCapture />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('DreamCapture', () => {
  it('should render dream input form', () => {
    renderDreamCapture();
    expect(screen.getAllByText(/꿈 기록/).length).toBeGreaterThan(0);
    expect(screen.getByText('어젯밤 어떤 꿈을 꾸셨나요?')).toBeInTheDocument();
  });

  it('should render save button', () => {
    renderDreamCapture();
    expect(screen.getByText('저장하기')).toBeInTheDocument();
  });

  it('should show empty state when no dreams', () => {
    renderDreamCapture();
    expect(screen.getByText('아직 기록된 꿈이 없어요')).toBeInTheDocument();
  });

  it('should render recent records section', () => {
    renderDreamCapture();
    expect(screen.getByText('최근 기록')).toBeInTheDocument();
  });
});
