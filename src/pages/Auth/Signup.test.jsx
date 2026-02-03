/**
 * Signup 페이지 스모크 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from './Signup';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  default: () => ({
    signUp: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  }),
}));

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>
  );
}

describe('Signup', () => {
  it('should render signup form', () => {
    renderSignup();
    expect(screen.getByText('회원가입')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호 (6자 이상)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호 확인')).toBeInTheDocument();
  });

  it('should render login link', () => {
    renderSignup();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  it('should show error for empty form submission', async () => {
    renderSignup();
    fireEvent.click(screen.getByText('가입하기'));
    expect(await screen.findByText('이메일과 비밀번호를 입력해주세요.')).toBeInTheDocument();
  });

  it('should show error for short password', async () => {
    renderSignup();
    fireEvent.change(screen.getByPlaceholderText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 (6자 이상)'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 확인'), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('가입하기'));
    expect(await screen.findByText('비밀번호는 6자 이상이어야 합니다.')).toBeInTheDocument();
  });

  it('should show error for password mismatch', async () => {
    renderSignup();
    fireEvent.change(screen.getByPlaceholderText('이메일'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 (6자 이상)'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 확인'), { target: { value: '654321' } });
    fireEvent.click(screen.getByText('가입하기'));
    expect(await screen.findByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
  });
});
