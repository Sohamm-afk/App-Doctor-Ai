import { motion } from 'framer-motion';
import { Cloud, DollarSign, Sparkles, TrendingDown } from 'lucide-react';
import { CloudCostCard, AIRecommendationCard } from '@/components/cards/Cards';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function CloudPage() {
  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Cloud size={22} className="text-blue-500" />
          <h1 className="font-heading text-h1 text-text">Cloud Cost</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Review potential cloud deployment configurations and cost optimizations.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="Monthly Cost Estimate"
            amount="Not Determined"
            subtitle="Live billing cannot be determined from files"
            icon={<DollarSign size={20} />}
            loading={false}
          />
        </motion.div>
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="Annual Run Rate"
            amount="Not Determined"
            subtitle="Live run rate is Not Determined"
            icon={<Cloud size={20} />}
            loading={false}
          />
        </motion.div>
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <CloudCostCard
            title="AI Identified Savings"
            amount="Not Determined"
            subtitle="Potential monthly savings"
            icon={<TrendingDown size={20} className="text-emerald-500" />}
            loading={false}
          />
        </motion.div>
      </div>

      {/* Chart and Table breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Cost distribution */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 min-h-[240px] flex flex-col justify-center text-center">
          <h3 className="text-h4 font-semibold text-text mb-4">Resource Cost Breakdown</h3>
          <div className="text-body-sm text-text-muted italic bg-bg-subtle/50 rounded-xl border border-dashed border-border p-8">
            Resource expenditures cannot be determined from repository files.
          </div>
        </motion.div>

        {/* Cost Table */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 min-h-[240px] flex flex-col justify-center text-center">
          <h3 className="text-h4 font-semibold text-text mb-4">Resource Allocation</h3>
          <div className="text-body-sm text-text-muted italic bg-bg-subtle/50 rounded-xl border border-dashed border-border p-8">
            Allocation shares are Not Determined.
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
          <AIRecommendationCard
            title="Deployment Optimization"
            description="Scanned deployment configuration files can be optimized, but actual dollar savings are Not Determined."
            effort="low"
            impact="low"
            loading={false}
          />
        </div>
      </motion.div>
    </div>
  );
}
