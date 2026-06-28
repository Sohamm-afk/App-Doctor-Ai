import { motion } from 'framer-motion';
import { FolderOpen, FileText, Shield, Zap, MessageSquare, Clock, Search } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────

export type EmptyStateVariant =
  | 'no-projects'
  | 'no-reports'
  | 'no-scan'
  | 'no-security'
  | 'no-chat'
  | 'no-timeline'
  | 'no-results'
  | 'generic';

interface EmptyStateProps {
  variant?:    EmptyStateVariant;
  title?:      string;
  description?: string;
  action?:     {
    label:   string;
    onClick: () => void;
    icon?:   React.ReactNode;
  };
  secondaryAction?: {
    label:   string;
    onClick: () => void;
  };
  className?:  string;
}

// ─── Variant configs ─────────────────────────────────────────────

const configs: Record<EmptyStateVariant, {
  icon:        React.ReactNode;
  title:       string;
  description: string;
}> = {
  'no-projects': {
    icon: <FolderOpen size={40} className="text-primary-400" />,
    title: 'No projects yet',
    description: 'Upload your first repository to get a comprehensive AI audit of your application.',
  },
  'no-reports': {
    icon: <FileText size={40} className="text-blue-400" />,
    title: 'No reports generated',
    description: 'Run a full scan first, then generate detailed reports for your stakeholders.',
  },
  'no-scan': {
    icon: (
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
        <span className="text-3xl">🔍</span>
      </div>
    ),
    title: 'No scan results yet',
    description: 'Start a scan to analyze your repository for security issues, performance bottlenecks, and more.',
  },
  'no-security': {
    icon: <Shield size={40} className="text-emerald-400" />,
    title: 'No security issues found',
    description: 'Your application appears to have no detected security vulnerabilities. Great work!',
  },
  'no-chat': {
    icon: <MessageSquare size={40} className="text-purple-400" />,
    title: 'Start a conversation',
    description: 'Ask your AI CTO anything about your application — architecture, security, performance, costs.',
  },
  'no-timeline': {
    icon: <Clock size={40} className="text-amber-400" />,
    title: 'No timeline events',
    description: 'Technical debt and architectural changes will appear here after your first scan.',
  },
  'no-results': {
    icon: <Search size={40} className="text-text-subtle" />,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  'generic': {
    icon: <FolderOpen size={40} className="text-text-subtle" />,
    title: 'Nothing here yet',
    description: 'This section will be populated after your first scan.',
  },
};

// ─── EmptyState ───────────────────────────────────────────────────

export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const cfg = configs[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-8',
        className,
      )}
    >
      {/* Illustration container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-bg-subtle border border-border flex items-center justify-center shadow-card mx-auto">
          {cfg.icon}
        </div>
      </motion.div>

      <h3 className="text-h3 font-semibold text-text mb-2">
        {title ?? cfg.title}
      </h3>
      <p className="text-body-sm text-text-muted max-w-sm mb-6">
        {description ?? cfg.description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button variant="primary" size="md" leftIcon={action.icon} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
