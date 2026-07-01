import { useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils';
import { useToastStore } from '@/hooks/useToastStore';
import type { ToastMessage } from '@/types';

// ─── Icon map ─────────────────────────────────────────────────────

const icons: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error:   <XCircle    size={18} className="text-red-500"     />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  info:    <Info       size={18} className="text-blue-500"    />,
};

const borderColors: Record<ToastMessage['type'], string> = {
  success: 'border-l-emerald-400',
  error:   'border-l-red-400',
  warning: 'border-l-amber-400',
  info:    'border-l-blue-400',
};

// ─── Single Toast ─────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 50,  scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'relative flex items-start gap-3 p-4 pr-10',
        'bg-bg-card rounded-xl shadow-dropdown border border-border',
        'border-l-4',
        borderColors[toast.type],
        'min-w-[300px] max-w-[420px]',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-semibold text-text">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-caption text-text-muted">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-3 right-3 text-text-subtle hover:text-text transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      className="fixed bottom-6 right-6 z-toast flex flex-col gap-3 items-end"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Context & Hook ───────────────────────────────────────────────

type ToastContextValue = {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { add } = useToastStore();

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    add({ ...msg, id: crypto.randomUUID() });
  }, [add]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
