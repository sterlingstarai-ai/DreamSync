/**
 * Toast 알림 시스템
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

/**
 * Toast Provider
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 3000 }) => {
    const id = Date.now() + Math.random();

    setToasts(prev => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
    custom: addToast,
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-container flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem
              key={t.id}
              {...t}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/**
 * Toast 아이템
 */
function ToastItem({ type, title, message, onClose }) {
  const Icon = icons[type];

  return (
    <div
      className={`
        toast flex items-start gap-3 p-4
        border rounded-xl shadow-lg
        animate-slide-in-down
        ${colors[type]}
      `}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-medium text-[var(--text-primary)]">{title}</p>
        )}
        {message && (
          <p className="text-sm mt-0.5 text-[var(--text-secondary)]">{message}</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * useToast Hook
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export default ToastProvider;
