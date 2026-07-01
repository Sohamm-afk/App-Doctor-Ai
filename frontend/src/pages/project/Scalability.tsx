import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { MetricCard, AIRecommendationCard, InformationCard } from '@/components/cards/Cards';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

export default function ScalabilityPage() {
  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={22} className="text-emerald-500" />
          <h1 className="font-heading text-h1 text-text">Scalability</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Predict and analyze repository scaling configs, database connection configurations, and limits.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            title: 'Max Concurrent Users',
            value: 'Not Determined',
            icon: <Users size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
          {
            title: 'Database Conn Utilization',
            value: 'Not Determined',
            icon: <Cpu size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
          {
            title: 'Request Queue Delay',
            value: 'Not Determined',
            icon: <Zap size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
          {
            title: 'Scalability Score',
            value: 'Not Determined',
            icon: <TrendingUp size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <MetricCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Scalability Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 lg:col-span-2 flex flex-col justify-center min-h-[280px]">
          <h3 className="text-h4 font-semibold text-text mb-4">Latency Projections vs. User Load</h3>
          <div className="flex-1 flex items-center justify-center text-body-sm text-text-muted italic bg-bg-subtle/50 rounded-xl border border-dashed border-border p-8">
            Latency and throughput projections under heavy user load cannot be determined from static repository analysis.
          </div>
        </motion.div>

        {/* Warning Banner */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-4 justify-between">
          <InformationCard
            title="Database Connection Limits"
            description="Database pool configuration limits are not determined from the repository contents."
            variant="warning"
            icon={<ShieldAlert className="text-amber-500" size={18} />}
          />
          <InformationCard
            title="Kubernetes HPA Config"
            description="Horizontal Pod Autoscaler configuration parameters are not determined in the repository files."
            variant="default"
            icon={<Cpu className="text-secondary-500" size={18} />}
          />
        </motion.div>
      </div>

      {/* AI Recommendations */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <h3 className="text-h4 font-semibold text-text">Scalability Optimizations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AIRecommendationCard
            title="Scalability Configuration"
            description="Automated Redis cache scaling and index optimization details are Not Determined."
            effort="low"
            impact="low"
          />
        </div>
      </motion.div>
    </div>
  );
}
