import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './Button';

// ─── Types ────────────────────────────────────────────────────────

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open:       boolean;
  onClose:    () => void;
  title?:     string;
  description?: string;
  size?:      ModalSize;
  children:   React.ReactNode;
  footer?:    React.ReactNode;
  /** If true, clicking backdrop does not close */
  persistent?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-5xl',
};

// ─── Backdrop ─────────────────────────────────────────────────────

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0 },
  exit:    { opacity: 0, scale: 0.95, y: 8 },
};

// ─── Modal ────────────────────────────────────────────────────────

export function Modal({
  open, onClose, title, description, size = 'md', children, footer, persistent = false, className,
}: ModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape' && !persistent) onClose(); },
    [onClose, persistent],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={persistent ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            className={cn(
              'relative w-full bg-white rounded-dialog shadow-dialog z-10',
              'flex flex-col max-h-[90vh]',
              sizeClasses[size],
              className,
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
                <div className="flex-1 mr-4">
                  {title && (
                    <h2 id="modal-title" className="text-h3 font-semibold text-text">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-body-sm text-text-muted">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-text-subtle hover:text-text transition-colors p-1 rounded-lg hover:bg-bg-subtle"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-6 pt-4 border-t border-border flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────

interface ConfirmModalProps {
  open:        boolean;
  onClose:     () => void;
  onConfirm:   () => void;
  title:       string;
  description: string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:     boolean;
  loading?:    boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div />
    </Modal>
  );
}
