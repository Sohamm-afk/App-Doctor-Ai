import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '@/utils';
import { Skeleton } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import type { LaunchRecommendation } from '@/types';

// ─── Card Base ────────────────────────────────────────────────────

interface CardBaseProps {
  className?: string;
  children:   React.ReactNode;
  onClick?:   () => void;
  hoverable?: boolean;
  loading?:   boolean;
}

export function CardBase({ className, children, onClick, hoverable = true, loading }: CardBaseProps) {
  if (loading) {
    return (
      <div className={cn('card p-6 space-y-3', className)} aria-hidden="true">
        <Skeleton height={20} className="w-1/3" />
        <Skeleton height={40} className="w-2/3" />
        <Skeleton height={16} className="w-full" />
      </div>
    );
  }

  return (
    <motion.div
      whileHover={hoverable && !onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'card p-6',
        hoverable && 'card-hover',
        onClick && 'card-clickable',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────

interface MetricCardProps {
  title:       string;
  value:       number | string;
  unit?:       string;
  change?:     number;
  changeLabel?: string;
  icon?:       React.ReactNode;
  trend?:      'up' | 'down' | 'stable';
  trendPositive?: boolean; // if true, "up" is good; if false, "up" is bad
  format?:     'number' | 'currency' | 'percent' | 'raw';
  loading?:    boolean;
  className?:  string;
  onClick?:    () => void;
}

export function MetricCard({
  title, value, unit, change, changeLabel, icon, trend, trendPositive = true,
  format = 'number', loading, className, onClick,
}: MetricCardProps) {
  const displayValue = () => {
    if (typeof value === 'string') return value;
    if (format === 'currency') return formatCurrency(value);
    if (format === 'number')   return formatNumber(value);
    if (format === 'percent')  return `${value}%`;
    return String(value);
  };

  const trendIcon = trend === 'up'
    ? <TrendingUp size={14} />
    : trend === 'down'
    ? <TrendingDown size={14} />
    : <Minus size={14} />;

  const isPositive = trend === 'stable' ? null : (trendPositive ? trend === 'up' : trend === 'down');

  return (
    <CardBase className={className} onClick={onClick} loading={loading}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-body-sm font-medium text-text-muted">{title}</p>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-display-sm font-bold text-text font-heading">
          {displayValue()}
        </span>
        {unit && <span className="text-body-sm text-text-muted">{unit}</span>}
      </div>
      {(change !== undefined || changeLabel) && (
        <div className={cn(
          'inline-flex items-center gap-1 text-caption font-medium',
          isPositive === true  && 'text-emerald-600',
          isPositive === false && 'text-red-500',
          isPositive === null  && 'text-text-muted',
        )}>
          {trend && trendIcon}
          {change !== undefined && <span>{change > 0 ? '+' : ''}{change}%</span>}
          {changeLabel && <span className="text-text-muted ml-1">{changeLabel}</span>}
        </div>
      )}
    </CardBase>
  );
}

// ─── Launch Score Card ────────────────────────────────────────────

interface LaunchScoreCardProps {
  score:          number;
  recommendation: LaunchRecommendation;
  breakdown:      { label: string; score: number }[];
  loading?:       boolean;
  className?:     string;
}

const recommendationConfig: Record<LaunchRecommendation, { label: string; color: string; bg: string }> = {
  'launch-ready':         { label: 'Launch Ready ✓',          color: 'text-emerald-700', bg: 'bg-emerald-50'  },
  'launch-with-caution':  { label: 'Launch With Caution ⚠',   color: 'text-amber-700',   bg: 'bg-amber-50'    },
  'not-ready':            { label: 'Not Ready — Fix Issues',   color: 'text-red-700',     bg: 'bg-red-50'      },
};

export function LaunchScoreCard({
  score, recommendation, breakdown, loading, className,
}: LaunchScoreCardProps) {
  if (loading) {
    return <CardBase loading className={className}><div/></CardBase>;
  }

  const cfg = recommendationConfig[recommendation];
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  const r = 40, circ = 2 * Math.PI * r;
  const dashOffset = circ - (score / 100) * circ;

  return (
    <CardBase className={cn('overflow-hidden', className)}>
      <div className="flex items-center gap-6 mb-6">
        {/* SVG ring */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label={`Launch score: ${score}`}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={scoreColor} strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-h2 font-bold font-heading text-text">{score}</span>
          </div>
        </div>
        {/* Text */}
        <div>
          <h3 className="text-h4 font-semibold text-text mb-1">Launch Score</h3>
          <span className={cn('inline-block px-3 py-1 rounded-full text-body-sm font-medium', cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
        </div>
      </div>
      {/* Breakdown */}
      <div className="space-y-3">
        {breakdown.map((item) => {
          const c = item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-amber-500' : 'bg-red-400';
          return (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-caption text-text-muted">{item.label}</span>
                <span className="text-caption font-semibold text-text">{item.score}</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', c)}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardBase>
  );
}

// ─── Project Card ─────────────────────────────────────────────────

import type { Project } from '@/types';
import { StatusBadge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/utils';
import { GitBranch } from 'lucide-react';

interface ProjectCardProps {
  project:  Project;
  onClick?: () => void;
  loading?: boolean;
}

export function ProjectCard({ project, onClick, loading }: ProjectCardProps) {
  const scoreColor = project.launchScore >= 80 ? 'text-emerald-600' : project.launchScore >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <CardBase onClick={onClick} loading={loading}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-h4 font-semibold text-text truncate">{project.name}</h3>
          <p className="text-caption text-text-muted mt-0.5">{project.framework}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-body-sm text-text-muted line-clamp-2 mb-4">{project.description}</p>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-text-muted text-caption">
          <GitBranch size={12} />
          <span className="truncate max-w-[140px]">{project.repositoryUrl.replace('https://', '')}</span>
        </div>
        <div className="flex items-center gap-2">
          {project.lastScannedAt && (
            <span className="text-caption text-text-subtle">{formatRelativeTime(project.lastScannedAt)}</span>
          )}
          <span className={cn('text-h4 font-bold font-heading', scoreColor)}>
            {project.launchScore}
          </span>
        </div>
      </div>
    </CardBase>
  );
}

// ─── Security Card ────────────────────────────────────────────────

import type { SecurityIssue } from '@/types';
import { SeverityBadge } from '@/components/ui/Badge';
import { Shield } from 'lucide-react';

interface SecurityCardProps {
  issue:    SecurityIssue;
  onClick?: () => void;
  loading?: boolean;
}

export function SecurityCard({ issue, onClick, loading }: SecurityCardProps) {
  return (
    <CardBase onClick={onClick} loading={loading}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <Shield size={16} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-body-sm font-semibold text-text flex-1">{issue.title}</h4>
            <SeverityBadge severity={issue.severity} />
          </div>
          <p className="text-caption text-text-muted line-clamp-2 mb-2">{issue.description}</p>
          {issue.filePath && (
            <code className="text-caption text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded font-mono">
              {issue.filePath}{issue.lineNumber && `:${issue.lineNumber}`}
            </code>
          )}
        </div>
      </div>
    </CardBase>
  );
}

// ─── Cloud Cost Card ──────────────────────────────────────────────

interface CloudCostCardProps {
  title:      string;
  amount:     number;
  subtitle?:  string;
  savings?:   number;
  icon?:      React.ReactNode;
  loading?:   boolean;
  className?: string;
}

export function CloudCostCard({ title, amount, subtitle, savings, icon, loading, className }: CloudCostCardProps) {
  return (
    <CardBase loading={loading} className={className}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-body-sm text-text-muted font-medium mb-0.5">{title}</p>
          {subtitle && <p className="text-caption text-text-subtle">{subtitle}</p>}
        </div>
        {icon && <div className="text-primary-500">{icon}</div>}
      </div>
      <p className="text-display-sm font-bold text-text font-heading">{formatCurrency(amount)}</p>
      {savings !== undefined && savings > 0 && (
        <Badge variant="success" className="mt-2">
          Save {formatCurrency(savings)}/mo
        </Badge>
      )}
    </CardBase>
  );
}

// ─── AI Recommendation Card ───────────────────────────────────────

interface AIRecommendationCardProps {
  title:       string;
  description: string;
  effort:      'low' | 'medium' | 'high';
  impact:      'low' | 'medium' | 'high';
  savings?:    number;
  onClick?:    () => void;
  loading?:    boolean;
}

export function AIRecommendationCard({
  title, description, effort, impact, savings, onClick, loading,
}: AIRecommendationCardProps) {
  const effortBadge: Record<string, 'success' | 'warning' | 'danger'> = {
    low: 'success', medium: 'warning', high: 'danger',
  };
  const impactBadge: Record<string, 'success' | 'warning' | 'low'> = {
    high: 'success', medium: 'warning', low: 'low',
  };

  return (
    <CardBase onClick={onClick} loading={loading}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-500 text-body-sm">✦</span>
        </div>
        <div className="flex-1">
          <h4 className="text-body-sm font-semibold text-text">{title}</h4>
          <p className="text-caption text-text-muted mt-1">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={effortBadge[effort]} size="xs">Effort: {effort}</Badge>
        <Badge variant={impactBadge[impact]} size="xs">Impact: {impact}</Badge>
        {savings !== undefined && (
          <Badge variant="primary" size="xs">Save {formatCurrency(savings)}/mo</Badge>
        )}
      </div>
    </CardBase>
  );
}

// ─── Information Card ─────────────────────────────────────────────

interface InformationCardProps {
  title:       string;
  description?: string;
  icon?:        React.ReactNode;
  variant?:    'default' | 'info' | 'warning' | 'success';
  children?:   React.ReactNode;
  className?:  string;
}

const infoVariants = {
  default: 'bg-bg-subtle border-border',
  info:    'bg-blue-50  border-blue-100',
  warning: 'bg-amber-50 border-amber-100',
  success: 'bg-emerald-50 border-emerald-100',
};

export function InformationCard({ title, description, icon, variant = 'default', children, className }: InformationCardProps) {
  return (
    <div className={cn('p-4 rounded-xl border', infoVariants[variant], className)}>
      <div className="flex gap-3">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div>
          <p className="text-body-sm font-semibold text-text">{title}</p>
          {description && <p className="text-caption text-text-muted mt-0.5">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Card ────────────────────────────────────────────────

interface TimelineCardProps {
  title: string;
  description?: string;
  date: string;
  status?: 'complete' | 'active' | 'pending' | 'error';
  icon?: React.ReactNode;
  loading?: boolean;
}

export function TimelineCard({ title, description, date, status = 'pending', icon, loading }: TimelineCardProps) {
  return (
    <CardBase loading={loading} className="relative pl-8 overflow-hidden">
      <div className="absolute left-6 top-6 bottom-0 w-px bg-border" />
      <div className={cn(
        'absolute left-4.5 top-6 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center',
        status === 'complete' && 'border-emerald-500 bg-emerald-500 text-white',
        status === 'active' && 'border-primary-500 bg-primary-500 text-white',
        status === 'error' && 'border-danger bg-danger text-white'
      )}>
        {icon}
      </div>
      <div>
        <span className="text-[10px] text-text-subtle font-medium">{date}</span>
        <h4 className="text-body-sm font-semibold text-text mt-0.5">{title}</h4>
        {description && <p className="text-caption text-text-muted mt-1">{description}</p>}
      </div>
    </CardBase>
  );
}

// ─── Recent Activity Card ─────────────────────────────────────────

interface RecentActivityCardProps {
  title: string;
  timestamp: string;
  statusText: string;
  status: 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  loading?: boolean;
}

export function RecentActivityCard({ title, timestamp, statusText, status, onClick, loading }: RecentActivityCardProps) {
  const dotColor = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[status];

  return (
    <CardBase onClick={onClick} loading={loading} className="flex items-center justify-between gap-4 py-4.5">
      <div className="flex-1 min-w-0">
        <h4 className="text-body-sm font-semibold text-text truncate">{title}</h4>
        <span className="text-caption text-text-subtle">{timestamp}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', dotColor)} />
        <span className="text-body-sm font-medium text-text-muted">{statusText}</span>
      </div>
    </CardBase>
  );
}

// ─── Upload Card ──────────────────────────────────────────────────

interface UploadCardProps {
  onUpload: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
  className?: string;
}

export function UploadCard({ onUpload, title = "Upload Repository", description = "Select files or paste repo link", loading, className }: UploadCardProps) {
  return (
    <CardBase onClick={onUpload} loading={loading} className={cn("border-2 border-dashed border-border hover:border-primary-400 text-center py-8 cursor-pointer", className)}>
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
        <TrendingUp size={20} className="text-primary-500" />
      </div>
      <h4 className="text-body-sm font-semibold text-text">{title}</h4>
      <p className="text-caption text-text-muted mt-1">{description}</p>
    </CardBase>
  );
}
