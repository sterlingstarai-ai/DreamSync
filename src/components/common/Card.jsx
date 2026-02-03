/**
 * Card 컴포넌트
 * 콘텐츠 컨테이너
 */
import { forwardRef } from 'react';

const variants = {
  default: 'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
  elevated: 'bg-[var(--bg-elevated)] shadow-lg shadow-black/20',
  glass: 'glass border border-[var(--border-color)]',
  gradient: 'bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-violet-500/20',
};

const Card = forwardRef(function Card(
  {
    children,
    variant = 'default',
    padding = 'md',
    rounded = 'xl',
    hover = false,
    onClick,
    className = '',
    ...props
  },
  ref
) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const roundedSizes = {
    none: '',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  return (
    <div
      ref={ref}
      className={`
        ${variants[variant]}
        ${paddings[padding]}
        ${roundedSizes[rounded]}
        ${hover ? 'transition-all duration-150 hover:border-[var(--border-color-hover)] hover:scale-[1.01] cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Card Header
 */
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Title
 */
export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-[var(--text-primary)] ${className}`}>
      {children}
    </h3>
  );
}

/**
 * Card Description
 */
export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`}>
      {children}
    </p>
  );
}

/**
 * Card Content
 */
export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Card Footer
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-[var(--border-color)] ${className}`}>
      {children}
    </div>
  );
}

export default Card;
