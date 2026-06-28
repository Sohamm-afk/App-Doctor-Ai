import { cn } from '@/utils';

// ─── Skeleton ─────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  width?:     string | number;
  height?:    string | number;
  rounded?:   'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Skeleton({ className, width, height, rounded = 'md' }: SkeletonProps) {
  const roundedMap = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  };
  return (
    <div
      className={cn(
        'skeleton',
        roundedMap[rounded],
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// ─── Skeleton Text ────────────────────────────────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-6 space-y-4', className)} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} className="w-2/3" />
          <Skeleton height={12} className="w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?:      SpinnerSize;
  color?:     string;
  className?: string;
  label?:     string;
}

const spinnerSizes: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
};

export function Spinner({ size = 'md', className, label = 'Loading…' }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)} role="status" aria-label={label}>
      <div
        className={cn(
          'rounded-full border-border border-t-primary-500 animate-spin',
          spinnerSizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Loading Overlay ──────────────────────────────────────────────

export function LoadingOverlay({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-body-sm text-text-muted font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Page Loading ─────────────────────────────────────────────────

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-body-sm text-text-muted">Loading…</p>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────

interface ProgressBarProps {
  value:      number; // 0-100
  max?:       number;
  size?:      'xs' | 'sm' | 'md';
  color?:     'primary' | 'success' | 'warning' | 'danger';
  animated?:  boolean;
  label?:     string;
  className?: string;
}

const progressColors: Record<NonNullable<ProgressBarProps['color']>, string> = {
  primary: 'bg-primary-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
};

const progressHeights: Record<NonNullable<ProgressBarProps['size']>, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export function ProgressBar({
  value, max = 100, size = 'sm', color = 'primary', animated = true, label, className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-caption text-text-muted">{label}</span>
          <span className="text-caption font-medium text-text">{value}%</span>
        </div>
      )}
      <div
        className={cn('w-full bg-border rounded-full overflow-hidden', progressHeights[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            progressColors[color],
            animated && 'progress-bar',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
