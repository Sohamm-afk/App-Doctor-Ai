import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Zap, Cloud, TrendingUp, Bot, AlertTriangle, GitBranch } from 'lucide-react';
import { MetricCard, LaunchScoreCard } from '@/components/cards/Cards';
import { AppRadarChart, AppAreaChart, CHART_COLORS } from '@/components/charts/Charts';
import { SeverityBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Loading';
import { formatRelativeTime, formatCurrency, getLaunchRecommendation } from '@/utils';
import { useToast } from '@/components/ui/Toast';
import type { Project, SecurityIssue, PerformanceMetric, CloudEstimate, Severity } from '@/types';

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading]     = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      setScanResult(JSON.parse(localScanData));
    }
    setLoading(false);
  }, [id]);

  if (!loading && !scanResult) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">No analysis available.</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view application insights.
        </p>
      </div>
    );
  }

  const security = scanResult?.security_findings || [];
  const project = scanResult ? {
    name: scanResult.metadata?.project_name || 'Unnamed Repository',
    status: 'active' as const,
    framework: scanResult.metadata?.frontend || scanResult.metadata?.backend || 'Other',
    lastScannedAt: new Date().toISOString(),
    launchScore: scanResult.launch_score?.overall ?? 0,
  } : undefined;

  const recommendation = getLaunchRecommendation(project?.launchScore ?? 0);
  const criticalCount  = security.filter((s: any) => s.severity === 'critical').length;
  const highCount      = security.filter((s: any) => s.severity === 'high').length;

  const radarData = [
    { subject: 'Security',     value: scanResult?.launch_score?.security ?? 100 },
    { subject: 'Performance',  value: scanResult?.launch_score?.performance ?? 100 },
    { subject: 'Architecture', value: scanResult?.launch_score?.overall ?? 100 },
    { subject: 'Cloud Cost',   value: scanResult?.launch_score?.cloud ?? 100 },
    { subject: 'Scalability',  value: scanResult?.launch_score?.cloud ?? 100 },
    { subject: 'Code Quality', value: scanResult?.launch_score?.quality ?? 100 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-heading text-h1 text-text">
              {loading ? '—' : project?.name}
            </h1>
            {!loading && project && (
              <StatusBadge status={project.status} />
            )}
          </div>
          <p className="text-body-sm text-text-muted">
            {loading ? 'Loading…' : `${project?.framework} · Last scanned ${project?.lastScannedAt ? formatRelativeTime(project.lastScannedAt) : 'never'}`}
          </p>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[
          {
            title: 'Security Issues', value: loading ? '—' : security.length,
            unit: 'found', icon: <Shield size={18} />,
            trend: 'stable' as const, trendPositive: true,
          },
          {
            title: 'API Response (p95)', value: '—',
            unit: 'ms', icon: <Zap size={18} />,
            trend: 'stable' as const, trendPositive: true,
          },
          {
            title: 'Monthly Cloud Cost', value: 'Not Determined',
            icon: <Cloud size={18} />,
            trend: 'stable' as const,
          },
          {
            title: 'Technical Debt', value: loading ? '—' : ((scanResult?.security_findings?.length ?? 0) + (scanResult?.quality_findings?.length ?? 0)),
            unit: 'items', icon: <AlertTriangle size={18} />,
            trend: 'stable' as const, trendPositive: true,
          },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <MetricCard {...card} loading={loading} />
          </motion.div>
        ))}
      </div>

      {/* Launch Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <LaunchScoreCard
            score={project?.launchScore ?? 0}
            recommendation={recommendation}
            breakdown={radarData.map((r) => ({ label: r.subject, score: r.value }))}
            loading={loading}
          />
        </motion.div>

        {/* Radar chart */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="card p-6 lg:col-span-2"
        >
          <h3 className="text-h4 font-semibold text-text mb-4">Score Breakdown</h3>
          <AppRadarChart data={radarData} height={240} loading={loading} />
        </motion.div>
      </div>

      {/* Response time chart + security summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="card p-6">
          <h3 className="text-h4 font-semibold text-text mb-4">API Response Time (14 days)</h3>
          <div className="flex items-center justify-center h-[200px] text-body-sm text-text-muted italic bg-bg-subtle/50 rounded-xl border border-dashed border-border">
            No telemetry data collected.
          </div>
        </motion.div>

        {/* Security summary */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h4 font-semibold text-text">Security Summary</h3>
            <Badge variant={criticalCount > 0 ? 'critical' : 'success'}>
              {criticalCount > 0 ? `${criticalCount} Critical` : 'No Critical'}
            </Badge>
          </div>
          {!loading && (
            <div className="space-y-3">
              {[
                { label: 'Critical', count: criticalCount },
                { label: 'High',     count: highCount     },
                { label: 'Medium',   count: security.filter((s: any) => s.severity === 'medium').length },
                { label: 'Low',      count: security.filter((s: any) => s.severity === 'low').length    },
              ].map((row) => {
                const pct = security.length > 0 ? Math.round((row.count / security.length) * 100) : 0;
                const sev = row.label.toLowerCase() as Severity;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <SeverityBadge severity={sev} />
                    <div className="flex-1">
                      <ProgressBar value={pct} size="xs" animated />
                    </div>
                    <span className="text-body-sm font-semibold text-text w-4 text-right">{row.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
