import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Activity, Clock, Server } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { AppAreaChart, CHART_COLORS } from '@/components/charts/Charts';
import { DataTable } from '@/components/common/Table';
import { Badge } from '@/components/ui/Badge';
import { mockService } from '@/services/mock';
import { MOCK_RESPONSE_TIME_SERIES, MOCK_THROUGHPUT_SERIES, MOCK_ERROR_RATE_SERIES, MOCK_MEMORY_SERIES } from '@/mocks/performance';
import { cn } from '@/utils';
import type { PerformanceMetric, TableColumn } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function PerformancePage() {
  const { id } = useParams<{ id: string }>();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'latency' | 'throughput' | 'error' | 'memory'>('latency');

  useEffect(() => {
    if (!id) return;
    mockService.getPerformanceMetrics(id).then((data) => {
      setMetrics(data);
      setLoading(false);
    });
  }, [id]);

  const mapTimeSeries = (series: typeof MOCK_RESPONSE_TIME_SERIES) => {
    return series.map((pt) => ({
      date: new Date(pt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(pt.value.toFixed(1)),
    }));
  };

  const chartData = {
    latency: {
      title: 'API Response Time (p95)',
      data: mapTimeSeries(MOCK_RESPONSE_TIME_SERIES),
      color: CHART_COLORS.primary,
      formatter: (v: number) => `${v}ms`,
    },
    throughput: {
      title: 'System Throughput',
      data: mapTimeSeries(MOCK_THROUGHPUT_SERIES),
      color: CHART_COLORS.secondary,
      formatter: (v: number) => `${v} req/s`,
    },
    error: {
      title: 'Error Rate',
      data: mapTimeSeries(MOCK_ERROR_RATE_SERIES),
      color: CHART_COLORS.danger,
      formatter: (v: number) => `${v}%`,
    },
    memory: {
      title: 'Memory Utilization',
      data: mapTimeSeries(MOCK_MEMORY_SERIES),
      color: CHART_COLORS.warning,
      formatter: (v: number) => `${v}%`,
    },
  }[activeChart];

  const columns: TableColumn<PerformanceMetric>[] = [
    {
      key: 'name',
      header: 'Metric',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-text">{row.name}</p>
          <span className="text-caption text-text-subtle font-mono uppercase">{row.category}</span>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Current Value',
      sortable: true,
      render: (_, row) => (
        <span className="font-semibold text-text">
          {row.value} {row.unit}
        </span>
      ),
    },
    {
      key: 'baseline',
      header: 'Baseline',
      render: (_, row) => (
        <span className="text-text-muted">
          {row.baseline ? `${row.baseline} ${row.unit}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const isCritical = row.value >= row.threshold.critical;
        const isWarning = row.value >= row.threshold.warning && row.value < row.threshold.critical;
        const variant = isCritical ? 'critical' : isWarning ? 'warning' : 'success';
        const label = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy';
        return <Badge variant={variant} dot>{label}</Badge>;
      },
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={22} className="text-amber-500" />
          <h1 className="font-heading text-h1 text-text">Performance</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Monitor your application response time, system throughput, and backend resource limits.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            key: 'latency',
            title: 'Response Time (p95)',
            value: '420 ms',
            icon: <Clock size={16} />,
            trend: 'up' as const,
            trendPositive: false,
            change: 12,
          },
          {
            key: 'throughput',
            title: 'Throughput',
            value: '1,240 req/s',
            icon: <Activity size={16} />,
            trend: 'up' as const,
            trendPositive: true,
            change: 8,
          },
          {
            key: 'error',
            title: 'Error Rate',
            value: '0.8%',
            icon: <Zap size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
          {
            key: 'memory',
            title: 'Memory Usage',
            value: '68%',
            icon: <Server size={16} />,
            trend: 'up' as const,
            trendPositive: false,
            change: 4,
          },
        ].map((card, i) => (
          <motion.div key={card.key} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <MetricCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              trendPositive={card.trendPositive}
              change={card.change}
              onClick={() => setActiveChart(card.key as any)}
              className={cn(activeChart === card.key && 'ring-2 ring-primary-500 border-primary-500')}
              loading={loading}
            />
          </motion.div>
        ))}
      </div>

      {/* Chart Panel */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h3 className="text-h4 font-semibold text-text">{chartData.title}</h3>
          <div className="flex bg-bg-subtle p-1 rounded-lg border border-border">
            {(['latency', 'throughput', 'error', 'memory'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChart(tab)}
                className={cn(
                  'px-3 py-1 rounded-md text-caption font-medium transition-colors capitalize',
                  activeChart === tab ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <AppAreaChart
          data={chartData.data}
          xKey="date"
          areas={[{ key: 'value', name: chartData.title, color: chartData.color }]}
          height={240}
          loading={loading}
          formatter={chartData.formatter}
        />
      </motion.div>

      {/* Details Table */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <h3 className="text-h4 font-semibold text-text">Performance Indicators</h3>
        <DataTable
          columns={columns}
          data={metrics}
          loading={loading}
          getRowKey={(m) => m.id}
        />
      </motion.div>
    </div>
  );
}
