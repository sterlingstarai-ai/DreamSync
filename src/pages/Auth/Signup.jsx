/**
 * 회원가입 페이지
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Moon, ArrowLeft } from 'lucide-react';
import { Button, Input } from '../../components/common';
import useAuth from '../../hooks/useAuth';

export default function Signup() {
  const { signUp, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    const result = await signUp({ email, password, name });
    if (!result.success) {
      setError('회원가입에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="safe-area-top px-4 py-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>돌아가기</span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-6">
          <Moon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          회원가입
        </h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">
          DreamSync와 함께 시작해보세요
        </p>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="text"
            placeholder="이름 (선택)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={User}
            autoComplete="name"
          />

          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            autoComplete="email"
          />

          <Input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            autoComplete="new-password"
          />

          <Input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={Lock}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
          >
            가입하기
          </Button>
        </form>

        {/* Terms */}
        <p className="mt-6 text-xs text-[var(--text-muted)] text-center max-w-xs">
          가입하면 DreamSync의{' '}
          <span className="text-violet-400">서비스 이용약관</span>과{' '}
          <span className="text-violet-400">개인정보 처리방침</span>에
          동의하는 것으로 간주됩니다.
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-8 text-center safe-area-bottom">
        <p className="text-[var(--text-secondary)]">
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
