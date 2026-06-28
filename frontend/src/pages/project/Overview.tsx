import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Zap, Cloud, TrendingUp, Bot, AlertTriangle, GitBranch } from 'lucide-react';
import { MetricCard, LaunchScoreCard } from '@/components/cards/Cards';
import { AppRadarChart, AppAreaChart, CHART_COLORS } from '@/components/charts/Charts';
import { SeverityBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Loading';
import { mockService } from '@/services/mock';
import { MOCK_RESPONSE_TIME_SERIES } from '@/mocks/performance';
import { formatRelativeTime, formatCurrency, getLaunchRecommendation } from '@/utils';
import type { Project, SecurityIssue, PerformanceMetric, CloudEstimate, Severity } from '@/types';

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject]     = useState<Project | undefined>();
  const [security, setSecurity]   = useState<SecurityIssue[]>([]);
  const [perf, setPerf]           = useState<PerformanceMetric[]>([]);
  const [cloud, setCloud]         = useState<CloudEstimate | undefined>();
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      mockService.getProject(id),
      mockService.getSecurityIssues(id),
      mockService.getPerformanceMetrics(id),
      mockService.getCloudEstimate(id),
    ]).then(([proj, sec, perf_, cld]) => {
      setProject(proj);
      setSecurity(sec);
      setPerf(perf_);
      setCloud(cld);
      setLoading(false);
    });
  }, [id]);

  if (!project && !loading) {
    return (
      <div className="text-center py-20">
        <h2 className="text-h2 font-heading text-text">Project not found</h2>
      </div>
    );
  }

  const recommendation = getLaunchRecommendation(project?.launchScore ?? 0);
  const criticalCount  = security.filter((s) => s.severity === 'critical').length;
  const highCount      = security.filter((s) => s.severity === 'high').length;

  const radarData = [
    { subject: 'Security',     value: 58 },
    { subject: 'Performance',  value: 72 },
    { subject: 'Architecture', value: 80 },
    { subject: 'Cloud Cost',   value: 65 },
    { subject: 'Scalability',  value: 76 },
    { subject: 'Code Quality', value: 85 },
  ];

  const seriesData = MOCK_RESPONSE_TIME_SERIES.slice(-14).map((pt) => ({
    date:  new Date(pt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.round(pt.value),
  }));

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
            trend: 'up' as const, trendPositive: false,
          },
          {
            title: 'API Response (p95)', value: loading ? '—' : 420,
            unit: 'ms', icon: <Zap size={18} />,
            trend: 'up' as const, trendPositive: false, change: 12,
          },
          {
            title: 'Monthly Cloud Cost', value: loading ? '—' : (cloud?.monthlyEstimate ?? 0),
            format: 'currency' as const, icon: <Cloud size={18} />,
            trend: 'stable' as const,
          },
          {
            title: 'Technical Debt', value: 18,
            unit: 'items', icon: <AlertTriangle size={18} />,
            trend: 'up' as const, trendPositive: false,
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
          <AppAreaChart
            data={seriesData}
            xKey="date"
            areas={[{ key: 'value', name: 'Response Time (ms)', color: CHART_COLORS.primary }]}
            height={200}
            loading={loading}
            formatter={(v) => `${v}ms`}
          />
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
                { label: 'Medium',   count: security.filter(s => s.severity === 'medium').length },
                { label: 'Low',      count: security.filter(s => s.severity === 'low').length    },
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
