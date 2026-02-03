/**
 * Safe Area 컴포넌트
 * 노치/홈 인디케이터 영역 처리
 */

/**
 * 페이지 컨테이너
 * Safe Area + Bottom Nav 고려
 */
export function PageContainer({ children, className = '', noPadding = false }) {
  return (
    <div
      className={`
        min-h-screen
        safe-area-top
        ${noPadding ? '' : 'px-4 pb-24'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * 페이지 헤더
 */
export function PageHeader({
  title,
  subtitle = '',
  leftAction = null,
  rightAction = null,
  className = '',
}) {
  return (
    <header className={`sticky top-0 z-30 safe-area-top bg-[var(--bg-primary)]/90 backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {leftAction}
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
        </div>
        {rightAction && (
          <div className="flex items-center gap-2">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * 스크롤 영역
 */
export function ScrollArea({ children, className = '' }) {
  return (
    <div className={`flex-1 overflow-y-auto overscroll-contain ${className}`}>
      {children}
    </div>
  );
}

/**
 * 고정 하단 영역 (버튼 등)
 */
export function BottomFixedArea({ children, className = '' }) {
  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        safe-area-bottom bg-[var(--bg-primary)]/90 backdrop-blur-md
        border-t border-[var(--border-color)]
        px-4 py-3
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * 빈 상태 표시
 */
export function EmptyState({
  icon: Icon,
  title,
  description = '',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default PageContainer;
