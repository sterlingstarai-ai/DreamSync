/**
 * 인증 관련 훅
 */
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

/**
 * 인증 훅
 * @returns {Object}
 */
export default function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
  } = useAuthStore(useShallow(state => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  })));

  const signUp = useAuthStore(state => state.signUp);
  const signIn = useAuthStore(state => state.signIn);
  const signOut = useAuthStore(state => state.signOut);
  const updateUser = useAuthStore(state => state.updateUser);
  const updateSettings = useAuthStore(state => state.updateSettings);
  const completeOnboarding = useAuthStore(state => state.completeOnboarding);

  /**
   * 회원가입
   */
  const handleSignUp = useCallback(async ({ email, password, name }) => {
    const result = await signUp({ email, password, name });
    if (result.success) {
      navigate('/onboarding');
    }
    return result;
  }, [signUp, navigate]);

  /**
   * 로그인
   */
  const handleSignIn = useCallback(async ({ email, password }) => {
    const result = await signIn({ email, password });
    if (result.success) {
      if (result.user?.onboardingCompleted) {
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    }
    return result;
  }, [signIn, navigate]);

  /**
   * 로그아웃
   */
  const handleSignOut = useCallback(async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/login');
    }
    return result;
  }, [signOut, navigate]);

  /**
   * 온보딩 완료
   */
  const handleCompleteOnboarding = useCallback(() => {
    completeOnboarding();
    navigate('/');
  }, [completeOnboarding, navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateUser,
    updateSettings,
    completeOnboarding: handleCompleteOnboarding,
  };
}
