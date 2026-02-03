/**
 * Input 컴포넌트
 * 텍스트 입력 필드
 */
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** @type {any} */
const Input = forwardRef(function Input(/** @type {any} */ props, ref) {
  const {
    label,
    error,
    hint,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    type = 'text',
    className = '',
    containerClassName = '',
    ...rest
  } = props;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <LeftIcon className="w-5 h-5" />
          </div>
        )}

        <input
          ref={ref}
          type={inputType}
          className={`
            w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)]
            rounded-xl px-4 py-3 text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${LeftIcon ? 'pl-10' : ''}
            ${RightIcon || isPassword ? 'pr-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {RightIcon && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <RightIcon className="w-5 h-5" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {hint && !error && (
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
});

/**
 * Textarea 컴포넌트
 */
/** @type {any} */
export const Textarea = forwardRef(function Textarea(/** @type {any} */ props, ref) {
  const {
    label,
    error,
    hint,
    rows = 4,
    className = '',
    containerClassName = '',
    ...rest
  } = props;
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)]
          rounded-xl px-4 py-3 text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)]
          focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
          transition-all duration-150 resize-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${className}
        `}
        {...rest}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {hint && !error && (
        <p className="text-sm text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
});

export default Input;
