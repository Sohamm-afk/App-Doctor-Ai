import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, DollarSign, Sparkles, TrendingDown } from 'lucide-react';
import { CloudCostCard, AIRecommendationCard } from '@/components/cards/Cards';
import { AppPieChart, CHART_COLOR_LIST } from '@/components/charts/Charts';
import { DataTable } from '@/components/common/Table';
import { mockService } from '@/services/mock';
import { useToast } from '@/components/ui/Toast';
import type { CloudEstimate, CloudCostBreakdown, TableColumn } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function CloudPage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<CloudEstimate | undefined>();
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    if (!id) return;
    mockService.getCloudEstimate(id)
      .then((data) => {
        setEstimate(data);
        setLoading(false);
      })
      .catch((err) => {
        error('Failed to load cloud estimate', err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [id, error]);

  const pieData = (estimate?.breakdown ?? []).map((item, i) => ({
    name: item.service,
    value: item.cost,
    color: CHART_COLOR_LIST[i % CHART_COLOR_LIST.length],
  }));

  const columns: TableColumn<CloudCostBreakdown>[] = [
    {
      key: 'service',
      header: 'Service Component',
      sortable: true,
      render: (v) => <span className="font-semibold text-text">{String(v)}</span>,
    },
    {
      key: 'cost',
      header: 'Monthly Cost',
      sortable: true,
      render: (v) => <span className="text-text font-medium">${Number(v)}/mo</span>,
    },
    {
      key: 'percentage',
      header: 'Share',
      sortable: true,
      render: (v) => <span className="text-text-muted">{Number(v)}%</span>,
    },
  ];

  const totalSavings = (estimate?.optimizations ?? []).reduce((acc, curr) => acc + curr.savings, 0);

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Cloud size={22} className="text-blue-500" />
          <h1 className="font-heading text-h1 text-text">Cloud Cost</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Analyze server resource expenditures and identify AI-driven saving opportunities.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="Monthly Cost Estimate"
            amount={estimate?.monthlyEstimate ?? 0}
            subtitle="Based on active cloud infrastructure"
            icon={<DollarSign size={20} />}
            loading={loading}
          />
        </motion.div>
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="Annual Run Rate"
            amount={estimate?.annualEstimate ?? 0}
            subtitle="Extrapolated over 12 months"
            icon={<Cloud size={20} />}
            loading={loading}
          />
        </motion.div>
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="AI Identified Savings"
            amount={totalSavings}
            subtitle="Monthly potential optimizations"
            savings={totalSavings}
            icon={<TrendingDown size={20} className="text-emerald-500" />}
            loading={loading}
          />
        </motion.div>
      </div>

      {/* Chart and Table breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Cost distribution */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="card p-6">
          <h3 className="text-h4 font-semibold text-text mb-4">Resource Cost Breakdown</h3>
          <AppPieChart data={pieData} height={260} innerRadius={60} loading={loading} />
        </motion.div>

        {/* Cost Table */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 flex flex-col">
          <h3 className="text-h4 font-semibold text-text mb-4">Resource Allocation</h3>
          <div className="flex-1 overflow-auto">
            <DataTable
              columns={columns}
              data={estimate?.breakdown ?? []}
              loading={loading}
              getRowKey={(item) => item.service}
            />
          </div>
        </motion.div>
      </div>

      {/* AI Recommendations */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-primary-500" />
          <h3 className="text-h4 font-semibold text-text">Cost Optimization Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(estimate?.optimizations ?? []).map((opt) => (
            <AIRecommendationCard
              key={opt.id}
              title={opt.title}
              description={opt.description}
              effort={opt.effort}
              impact={opt.impact}
              savings={opt.savings}
              loading={loading}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
