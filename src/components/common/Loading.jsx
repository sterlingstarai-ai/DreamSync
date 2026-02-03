/**
 * Loading 컴포넌트
 * 로딩 상태 표시
 */
import { Loader2 } from 'lucide-react';

/**
 * Spinner
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2
      className={`animate-spin text-violet-500 ${sizes[size]} ${className}`}
    />
  );
}

/**
 * Full Page Loading
 */
export function PageLoading({ message }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg-primary)] z-50">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--bg-tertiary)]" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
      </div>
      {message && (
        <p className="mt-4 text-[var(--text-secondary)] animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Inline Loading
 */
export function InlineLoading({ message }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <Spinner size="md" />
      {message && (
        <span className="text-[var(--text-secondary)]">{message}</span>
      )}
    </div>
  );
}

/**
 * Skeleton Loading
 */
export function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded w-3/4',
    avatar: 'w-12 h-12 rounded-full',
    card: 'h-24 rounded-xl',
    image: 'aspect-video rounded-xl',
  };

  return (
    <div className={`skeleton ${variants[variant]} ${className}`} />
  );
}

/**
 * Skeleton Card
 */
export function SkeletonCard() {
  return (
    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-3">
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" className="w-2/3" />
    </div>
  );
}

/**
 * Skeleton List
 */
export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Loading Dots
 */
export function LoadingDots({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export default PageLoading;
