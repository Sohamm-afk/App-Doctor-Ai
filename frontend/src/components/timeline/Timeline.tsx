import { motion } from 'framer-motion';
import { cn } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────

export interface TimelineItem {
  id:          string;
  title:       string;
  description?: string;
  date?:       string;
  status?:     'complete' | 'active' | 'pending' | 'error';
  icon?:       React.ReactNode;
  children?:   React.ReactNode;
}

// ─── Vertical Timeline ────────────────────────────────────────────

interface VerticalTimelineProps {
  items:      TimelineItem[];
  className?: string;
  loading?:   boolean;
}

const dotColors = {
  complete: 'bg-emerald-500 border-emerald-200',
  active:   'bg-primary-500 border-primary-200 ring-4 ring-primary-100',
  pending:  'bg-white       border-border',
  error:    'bg-red-500     border-red-200',
};

const lineColors = {
  complete: 'bg-emerald-300',
  active:   'bg-border',
  pending:  'bg-border',
  error:    'bg-red-200',
};

export function VerticalTimeline({ items, className }: VerticalTimelineProps) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, i) => {
        const status = item.status ?? 'pending';
        const isLast = i === items.length - 1;

        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* Line */}
            {!isLast && (
              <div
                className={cn('absolute left-3.5 top-7 bottom-0 w-px', lineColors[status])}
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div className="relative flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center mt-0.5 z-10 relative',
                dotColors[status],
              )}>
                {item.icon && <span className="text-white">{item.icon}</span>}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-body-sm font-semibold text-text">{item.title}</h4>
                {item.date && (
                  <span className="text-caption text-text-subtle ml-auto flex-shrink-0">{item.date}</span>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-caption text-text-muted">{item.description}</p>
              )}
              {item.children && (
                <div className="mt-3">{item.children}</div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

// ─── Horizontal Timeline ──────────────────────────────────────────

interface HorizontalTimelineProps {
  items:      TimelineItem[];
  className?: string;
}

export function HorizontalTimeline({ items, className }: HorizontalTimelineProps) {
  return (
    <div className={cn('flex items-start gap-0 overflow-x-auto no-scrollbar', className)}>
      {items.map((item, i) => {
        const status = item.status ?? 'pending';
        const isLast = i === items.length - 1;

        return (
          <motion.div
            key={item.id}
            className="flex flex-col items-center flex-1 min-w-[120px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.08 }}
          >
            {/* Step + Line row */}
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={cn('flex-1 h-px', status === 'complete' ? 'bg-emerald-300' : 'bg-border')} />
              )}
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                dotColors[status],
              )}>
                {status === 'complete' ? (
                  <span className="text-white text-caption">✓</span>
                ) : (
                  <span className="text-caption text-text-muted font-medium">{i + 1}</span>
                )}
              </div>
              {!isLast && (
                <div className={cn('flex-1 h-px', status === 'complete' ? 'bg-emerald-300' : 'bg-border')} />
              )}
            </div>
            {/* Label */}
            <div className="mt-2 text-center px-2">
              <p className="text-caption font-medium text-text">{item.title}</p>
              {item.date && <p className="text-[10px] text-text-subtle mt-0.5">{item.date}</p>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
