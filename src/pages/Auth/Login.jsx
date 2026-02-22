/**
 * 로그인 페이지
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Moon, Sparkles } from 'lucide-react';
import { Button, Input } from '../../components/common';
import useAuth from '../../hooks/useAuth';

export default function Login() {
  const { signIn, signUp, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const result = await signIn({ email, password });
    if (!result.success) {
      setError('로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Moon className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          DreamSync
        </h1>
        <p className="text-[var(--text-secondary)] text-center mb-8">
          당신의 꿈과 감정을 연결하는
          <br />
          패턴 기반 웰니스 코파일럿
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
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
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            autoComplete="current-password"
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
            로그인
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-sm my-6">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-sm text-[var(--text-muted)]">또는</span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Social Login (Placeholder) */}
        <div className="w-full max-w-sm space-y-3">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={async () => {
              // 게스트 계정이 없으면 생성 후 진입
              const credentials = { email: 'guest@dreamsync.app', password: 'guest123' };
              const signedIn = await signIn(credentials);
              if (!signedIn.success) {
                await signUp({ ...credentials, name: 'Guest' });
              }
            }}
          >
            게스트로 시작하기
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-8 text-center safe-area-bottom">
        <p className="text-[var(--text-secondary)]">
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
