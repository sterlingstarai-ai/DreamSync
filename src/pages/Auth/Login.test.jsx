/**
 * Login 페이지 스모크 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  default: () => ({
    signIn: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  }),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login', () => {
  it('should render login form', () => {
    renderLogin();
    expect(screen.getByText('DreamSync')).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument();
  });

  it('should render guest login button', () => {
    renderLogin();
    expect(screen.getByText('게스트로 시작하기')).toBeInTheDocument();
  });

  it('should render signup link', () => {
    renderLogin();
    expect(screen.getByText('회원가입')).toBeInTheDocument();
  });

  it('should show error when submitting empty form', async () => {
    renderLogin();
    const submitButton = screen.getByText('로그인');
    fireEvent.click(submitButton);

    expect(await screen.findByText('이메일과 비밀번호를 입력해주세요.')).toBeInTheDocument();
  });
});
