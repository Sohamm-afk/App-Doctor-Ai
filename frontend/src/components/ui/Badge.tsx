import { cn } from '@/utils';
import type { Severity, Status } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'critical'
  | 'danger'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'new'
  | 'beta';

export type BadgeSize = 'xs' | 'sm' | 'md';

// ─── Styles ───────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  success:  'bg-emerald-50  text-emerald-700 border-emerald-200',
  warning:  'bg-amber-50    text-amber-700   border-amber-200',
  critical: 'bg-red-50      text-red-700     border-red-200',
  danger:   'bg-red-50      text-red-700     border-red-200',
  high:     'bg-orange-50   text-orange-700  border-orange-200',
  medium:   'bg-yellow-50   text-yellow-700  border-yellow-200',
  low:      'bg-blue-50     text-blue-700    border-blue-200',
  info:     'bg-blue-50     text-blue-700    border-blue-200',
  neutral:  'bg-gray-50     text-gray-600    border-gray-200',
  primary:  'bg-emerald-50  text-emerald-700 border-emerald-200',
  new:      'bg-violet-50   text-violet-700  border-violet-200',
  beta:     'bg-amber-50    text-amber-700   border-amber-200',
};

const dotColors: Record<BadgeVariant, string> = {
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  critical: 'bg-red-500',
  danger:   'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
  info:     'bg-blue-500',
  neutral:  'bg-gray-400',
  primary:  'bg-emerald-500',
  new:      'bg-violet-500',
  beta:     'bg-amber-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-1',
  sm: 'text-[11px] px-2   py-0.5 gap-1',
  md: 'text-xs     px-2.5 py-1   gap-1.5',
};

// ─── Severity → BadgeVariant map ──────────────────────────────────

const severityVariantMap: Record<Severity, BadgeVariant> = {
  critical: 'critical',
  high:     'high',
  medium:   'medium',
  low:      'low',
  info:     'info',
};

const statusVariantMap: Record<Status, BadgeVariant> = {
  active:   'success',
  success:  'success',
  pending:  'warning',
  scanning: 'info',
  error:    'danger',
  archived: 'neutral',
};

// ─── Props ────────────────────────────────────────────────────────

interface BadgeProps {
  variant?:   BadgeVariant;
  severity?:  Severity;
  status?:    Status;
  size?:      BadgeSize;
  dot?:       boolean;
  children:   React.ReactNode;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────

export function Badge({
  variant,
  severity,
  status,
  size      = 'sm',
  dot       = false,
  children,
  className,
}: BadgeProps) {
  // Resolve variant from severity or status if not explicitly provided
  const resolvedVariant: BadgeVariant =
    variant ??
    (severity ? severityVariantMap[severity] : undefined) ??
    (status   ? statusVariantMap[status]     : undefined) ??
    'neutral';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-badge border',
        variantStyles[resolvedVariant],
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('rounded-full flex-shrink-0', dotColors[resolvedVariant], size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ─── Severity Badge convenience wrapper ──────────────────────────

export function SeverityBadge({ severity }: { severity: Severity }) {
  const labels: Record<Severity, string> = {
    critical: 'Critical',
    high:     'High',
    medium:   'Medium',
    low:      'Low',
    info:     'Info',
  };
  return <Badge severity={severity} dot>{labels[severity]}</Badge>;
}

// ─── Status Badge convenience wrapper ────────────────────────────

export function StatusBadge({ status }: { status: Status }) {
  const labels: Record<Status, string> = {
    active:   'Active',
    success:  'Complete',
    pending:  'Pending',
    scanning: 'Scanning',
    error:    'Error',
    archived: 'Archived',
  };
  return <Badge status={status} dot>{labels[status]}</Badge>;
}
