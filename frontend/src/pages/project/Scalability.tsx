import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { MetricCard, AIRecommendationCard, InformationCard } from '@/components/cards/Cards';
import { AppLineChart, CHART_COLORS } from '@/components/charts/Charts';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

const SCALABILITY_PROJECTIONS = [
  { users: '100 Users',  latency: 180, errors: 0.1 },
  { users: '500 Users',  latency: 220, errors: 0.2 },
  { users: '1K Users',   latency: 290, errors: 0.5 },
  { users: '5K Users',   latency: 420, errors: 0.8 },
  { users: '10K Users',  latency: 950, errors: 3.4 },
];

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
          Predict how your system response times, queues, and databases perform under heavy loading stress.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            title: 'Max Concurrent Users',
            value: '8,500',
            unit: 'est',
            icon: <Users size={16} />,
            trend: 'stable' as const,
            trendPositive: true,
          },
          {
            title: 'Database Conn Utilization',
            value: '78%',
            icon: <Cpu size={16} />,
            trend: 'up' as const,
            trendPositive: false,
            change: 15,
          },
          {
            title: 'Request Queue Delay',
            value: '14 ms',
            icon: <Zap size={16} />,
            trend: 'up' as const,
            trendPositive: false,
            change: 22,
          },
          {
            title: 'Scalability Score',
            value: '76/100',
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
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 lg:col-span-2">
          <h3 className="text-h4 font-semibold text-text mb-4">Latency Projections vs. User Load</h3>
          <AppLineChart
            data={SCALABILITY_PROJECTIONS}
            xKey="users"
            lines={[
              { key: 'latency', name: 'Latency (ms)', color: CHART_COLORS.primary },
            ]}
            height={240}
            formatter={(v) => `${v}ms`}
          />
        </motion.div>

        {/* Warning Banner */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-4 justify-between">
          <InformationCard
            title="Database Connection Limits"
            description="Database pool is capped at 100 connections. Above 8,000 active users, threads will block waiting for a database socket."
            variant="warning"
            icon={<ShieldAlert className="text-amber-500" size={18} />}
          />
          <InformationCard
            title="Kubernetes HPA Config"
            description="Horizontal Pod Autoscaler triggers scaling at 80% CPU. Minimum pods are set to 2. Consider increasing min replica count to 4."
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
            title="Implement Redis Session Caching"
            description="Migrate local session storage to Redis to enable stateless horizontally-scalable API replicas."
            effort="low"
            impact="high"
          />
          <AIRecommendationCard
            title="Index Order Table by User ID"
            description="Missing indexes on orders(user_id) table will degrade lookup times when concurrent orders exceed 500/min."
            effort="medium"
            impact="high"
          />
        </div>
      </motion.div>
    </div>
  );
}
