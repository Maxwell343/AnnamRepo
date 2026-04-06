import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import './ToastProvider.css';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastEntry {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 3200;

const variantIcons: Record<ToastVariant, string> = {
  success: 'OK',
  error: 'ERR',
  warning: 'WARN',
  info: 'INFO',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++idRef.current;
      const nextToast: ToastEntry = {
        id,
        title: options.title,
        message,
        variant: options.variant || 'info',
      };

      setToasts((prev) => [...prev, nextToast]);

      const duration = options.duration ?? DEFAULT_DURATION_MS;
      window.setTimeout(() => {
        dismissToast(id);
      }, duration);
    },
    [dismissToast]
  );

  const contextValue = useMemo(
    () => ({
      showToast,
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div className="annam-toast-root" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`annam-toast annam-toast--${toast.variant}`}>
            <div className="annam-toast__icon" aria-hidden="true">
              {variantIcons[toast.variant]}
            </div>
            <div className="annam-toast__content">
              {toast.title ? <p className="annam-toast__title">{toast.title}</p> : null}
              <p className="annam-toast__message">{toast.message}</p>
            </div>
            <button
              className="annam-toast__close"
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
