/**
 * Placeholder pages for routes not yet implemented.
 * Each exports a React component that renders a beautiful placeholder.
 */
import { motion } from 'framer-motion';
import { GitBranch, Zap, Cloud, TrendingUp, AlertTriangle, Bot, Wrench, FileText, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface PlaceholderProps {
  icon:    React.ReactNode;
  title:   string;
  description: string;
  badge?:  string;
}

function Placeholder({ icon, title, description, badge }: PlaceholderProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h1 className="font-heading text-h1 text-text">{title}</h1>
          {badge && <Badge variant="info" size="sm">{badge}</Badge>}
        </div>
        <p className="text-body-sm text-text-muted mb-8">{description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
      >
        <div className="w-20 h-20 rounded-2xl bg-bg-subtle border border-border flex items-center justify-center mb-6 shadow-card">
          <div className="opacity-40 scale-150">{icon}</div>
        </div>
        <h2 className="font-heading text-h3 text-text mb-2">Coming in Sprint 2</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          This section will display {title.toLowerCase()} data from your AI analysis.
          Connect your repository to see detailed results here.
        </p>
      </motion.div>
    </div>
  );
}

export function ArchitecturePage() {
  return <Placeholder
    icon={<GitBranch size={22} className="text-purple-500" />}
    title="Architecture"
    description="Interactive architecture map generated from your codebase."
    badge="React Flow"
  />;
}

export function PerformancePage() {
  return <Placeholder
    icon={<Zap size={22} className="text-amber-500" />}
    title="Performance"
    description="Response time, throughput, error rates, and resource utilization."
  />;
}

export function CloudPage() {
  return <Placeholder
    icon={<Cloud size={22} className="text-blue-500" />}
    title="Cloud Cost"
    description="Estimated monthly cloud spend with optimization recommendations."
  />;
}

export function ScalabilityPage() {
  return <Placeholder
    icon={<TrendingUp size={22} className="text-emerald-500" />}
    title="Scalability"
    description="Understand how your app will handle 10× or 100× traffic growth."
  />;
}

export function TechnicalDebtPage() {
  return <Placeholder
    icon={<AlertTriangle size={22} className="text-amber-500" />}
    title="Technical Debt"
    description="Timeline of technical debt items ranked by impact and effort."
  />;
}

export function AICTOPage() {
  return <Placeholder
    icon={<Bot size={22} className="text-primary-500" />}
    title="AI CTO"
    description="Full-page AI CTO chat with deep code analysis and recommendations."
    badge="Powered by AI"
  />;
}

export function FixesPage() {
  return <Placeholder
    icon={<Wrench size={22} className="text-secondary-500" />}
    title="One-Click Fixes"
    description="Auto-generated code patches for detected issues — review and apply."
    badge="New"
  />;
}

export function ReportsPage() {
  return <Placeholder
    icon={<FileText size={22} className="text-blue-500" />}
    title="Reports"
    description="Generate and download PDF reports for stakeholders and auditors."
  />;
}

export function SettingsPage() {
  return <Placeholder
    icon={<Settings size={22} className="text-secondary-500" />}
    title="Settings"
    description="Configure repository access, notifications, and team settings."
  />;
}
