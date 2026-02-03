/**
 * Button 컴포넌트
 * 다양한 variant와 size 지원
 */
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const variants = {
  primary: 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98]',
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--border-color-hover)] active:scale-[0.98]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98]',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3.5 text-lg rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

/**
 * 햅틱 피드백 실행
 */
async function triggerHaptic() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // 햅틱 실패 무시
    }
  }
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    haptic = true,
    className = '',
    onClick,
    ...props
  },
  ref
) {
  const handleClick = async (e) => {
    if (disabled || loading) return;

    if (haptic) {
      await triggerHaptic();
    }

    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {children}
    </button>
  );
});

export default Button;
