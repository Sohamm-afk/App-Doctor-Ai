import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────

export type DrawerSide = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

interface DrawerProps {
  open:      boolean;
  onClose:   () => void;
  side?:     DrawerSide;
  size?:     DrawerSize;
  title?:    string;
  description?: string;
  children:  React.ReactNode;
  footer?:   React.ReactNode;
  className?: string;
}

const sizeMap: Record<DrawerSize, string> = {
  sm:  'max-w-xs',
  md:  'max-w-sm',
  lg:  'max-w-md',
  xl:  'max-w-lg',
};

const slideVariants = {
  left: {
    hidden:  { x: '-100%', opacity: 0 },
    visible: { x: 0,       opacity: 1 },
    exit:    { x: '-100%', opacity: 0 },
  },
  right: {
    hidden:  { x: '100%', opacity: 0 },
    visible: { x: 0,      opacity: 1 },
    exit:    { x: '100%', opacity: 0 },
  },
};

// ─── Drawer ───────────────────────────────────────────────────────

export function Drawer({
  open, onClose, side = 'right', size = 'md', title, description, children, footer, className,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
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
          className="fixed inset-0 z-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'drawer-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            className={cn(
              'absolute top-0 bottom-0 w-full bg-white shadow-dialog flex flex-col',
              side === 'left' ? 'left-0' : 'right-0',
              sizeMap[size],
              className,
            )}
            variants={slideVariants[side]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
              <div>
                {title && (
                  <h2 id="drawer-title" className="text-h3 font-semibold text-text">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-body-sm text-text-muted">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-text-subtle hover:text-text transition-colors p-1 rounded-lg hover:bg-bg-subtle ml-4"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-6 pt-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
