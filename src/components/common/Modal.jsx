/**
 * Modal 컴포넌트
 * 다이얼로그/모달 창
 */
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
  isOpen,
  onClose,
  title,
  description = '',
  children,
  footer = null,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  className = '',
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100%-2rem)] h-[calc(100%-2rem)]',
  };

  // ESC 키로 닫기
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlay) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        className={`
          relative w-full ${sizes[size]}
          bg-[var(--bg-secondary)] border border-[var(--border-color)]
          rounded-2xl shadow-2xl
          animate-fade-in-up
          ${size === 'full' ? 'flex flex-col' : ''}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-[var(--border-color)]">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`p-5 ${size === 'full' ? 'flex-1 overflow-auto' : ''}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-color)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Confirm Modal
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'primary',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-[var(--text-secondary)]">{message}</p>
    </Modal>
  );
}
