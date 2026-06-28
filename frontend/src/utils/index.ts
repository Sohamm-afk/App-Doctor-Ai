import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SEVERITY_COLORS, STATUS_COLORS, LAUNCH_SCORE_THRESHOLDS } from '@/constants';
import type { Severity, Status, LaunchRecommendation } from '@/types';

// ─── Class Name Helper ────────────────────────────────────────────

/** Merges Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ──────────────────────────────────────────────

/** Formats an ISO date string to a human-readable relative date. */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);

  if (diffSecs < 60)   return 'just now';
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffHours < 24)  return `${diffHours}h ago`;
  if (diffDays < 7)    return `${diffDays}d ago`;
  if (diffDays < 30)   return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365)  return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/** Formats an ISO date string to a readable date like "Jun 28, 2026". */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  }).format(new Date(dateStr));
}

/** Formats an ISO date string to "Jun 28, 2026 at 8:52 PM". */
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr));
}

// ─── Number Formatting ────────────────────────────────────────────

/** Formats a number with comma separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Formats a number as a compact string: 1200 → "1.2K". */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/** Formats a currency value: 1234.5 → "$1,234.50". */
export function formatCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Formats bytes to human-readable size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Formats a duration in milliseconds to a readable string. */
export function formatDuration(ms: number): string {
  if (ms < 1000)       return `${ms}ms`;
  if (ms < 60_000)     return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

// ─── Status Formatters ────────────────────────────────────────────

/** Returns the Tailwind color classes for a given severity level. */
export function getSeverityColors(severity: Severity) {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info;
}

/** Returns the Tailwind color classes for a given status. */
export function getStatusColors(status: Status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.pending;
}

/** Derives a LaunchRecommendation from a numeric score. */
export function getLaunchRecommendation(score: number): LaunchRecommendation {
  if (score >= LAUNCH_SCORE_THRESHOLDS.READY)   return 'launch-ready';
  if (score >= LAUNCH_SCORE_THRESHOLDS.CAUTION) return 'launch-with-caution';
  return 'not-ready';
}

/** Returns a color class for a launch score. */
export function getLaunchScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

/** Returns a background class for a launch score ring. */
export function getLaunchScoreBg(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

// ─── String Utilities ─────────────────────────────────────────────

/** Truncates text to a max length with ellipsis. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}

/** Capitalizes the first letter of a string. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Converts a kebab-case or snake_case string to Title Case. */
export function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (txt) => capitalize(txt));
}

/** Generates a random short UUID for mock data. */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── URL Utilities ────────────────────────────────────────────────

/** Extracts the repo name from a URL. */
export function extractRepoName(url: string): string {
  try {
    const parts = url.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

/** Validates a git repository URL. */
export function isValidRepoUrl(url: string): boolean {
  return /^(https?:\/\/)?(github|gitlab|bitbucket)\.com\/[\w-]+\/[\w-]+(\.git)?$/.test(url);
}

// ─── Array Utilities ──────────────────────────────────────────────

/** Groups an array by a key. */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/** Sorts an array of objects by a field. */
export function sortBy<T>(arr: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}
