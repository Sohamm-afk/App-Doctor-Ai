import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Hammer, ShieldAlert } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { DataTable } from '@/components/common/Table';
import { Badge } from '@/components/ui/Badge';
import { VerticalTimeline } from '@/components/timeline/Timeline';
import { formatNumber } from '@/utils';
import type { TableColumn, Severity } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

interface TechDebtItem {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  hours: number;
  status: 'open' | 'deferred' | 'resolved';
}

const MOCK_DEBT_ITEMS: TechDebtItem[] = [
  { id: '1', title: 'Refactor Auth Middleware', category: 'design-pattern-violation', severity: 'high', hours: 12, status: 'open' },
  { id: '2', title: 'Replace Deprecated Axios Version', category: 'deprecated-dependency', severity: 'medium', hours: 4, status: 'open' },
  { id: '3', title: 'Improve Test Coverage on Payments', category: 'missing-tests', severity: 'critical', hours: 24, status: 'open' },
  { id: '4', title: 'Remove Duplicated Search Query Logic', category: 'code-duplication', severity: 'low', hours: 6, status: 'deferred' },
  { id: '5', title: 'Document Webhook Event Schemas', category: 'poor-documentation', severity: 'low', hours: 8, status: 'resolved' },
];

export default function TechnicalDebtPage() {
  const [items] = useState<TechDebtItem[]>(MOCK_DEBT_ITEMS);

  const columns: TableColumn<TechDebtItem>[] = [
    {
      key: 'title',
      header: 'Technical Debt Item',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-text">{row.title}</p>
          <span className="text-caption text-text-muted font-mono uppercase">{row.category}</span>
        </div>
      ),
    },
    {
      key: 'hours',
      header: 'Est. Remediation Effort',
      sortable: true,
      render: (v) => <span className="font-semibold text-text">{Number(v)} hours</span>,
    },
    {
      key: 'severity',
      header: 'Impact Severity',
      sortable: true,
      render: (v) => {
        const sev = String(v) as Severity;
        return (
          <Badge variant={sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low'} dot>
            {sev}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v) => {
        const val = String(v);
        return (
          <Badge variant={val === 'resolved' ? 'success' : val === 'deferred' ? 'neutral' : 'warning'} size="xs">
            {val}
          </Badge>
        );
      },
    },
  ];

  const totalHours = items.reduce((acc, curr) => (curr.status !== 'resolved' ? acc + curr.hours : acc), 0);
  const resolvedHours = items.reduce((acc, curr) => (curr.status === 'resolved' ? acc + curr.hours : acc), 0);

  const timelineEvents = [
    {
      id: 'e1',
      title: 'Payments Module Tests Added',
      description: 'Resolved payment mock integration issues and set up Jest coverage tracking.',
      date: 'June 26, 2026',
      status: 'complete' as const,
      icon: <Hammer size={12} />,
    },
    {
      id: 'e2',
      title: 'Auth Middleware Refactoring Plan',
      description: 'AI CTO proposed refactoring JWT signature check paths to run in sub-routines.',
      date: 'June 28, 2026',
      status: 'active' as const,
      icon: <AlertTriangle size={12} />,
    },
    {
      id: 'e3',
      title: 'Dependency Upgrade Campaign',
      description: 'Prepare to update packages in package.json including major library versions.',
      date: 'July 2, 2026',
      status: 'pending' as const,
      icon: <Clock size={12} />,
    },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={22} className="text-amber-500" />
          <h1 className="font-heading text-h1 text-text">Technical Debt</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Track code duplication, deprecated packages, test gaps, and design-pattern violations.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <MetricCard
            title="Total Technical Debt"
            value={totalHours}
            unit="hours"
            icon={<Clock size={16} />}
            trend="up"
            trendPositive={false}
            change={8}
          />
        </motion.div>
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <MetricCard
            title="Remediated Debt"
            value={resolvedHours}
            unit="hours"
            icon={<Hammer size={16} />}
            trend="up"
            trendPositive={true}
            change={15}
          />
        </motion.div>
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
          <MetricCard
            title="Deferred Items"
            value={items.filter((item) => item.status === 'deferred').length}
            unit="tasks"
            icon={<AlertTriangle size={16} />}
            trend="stable"
            trendPositive={true}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Table list */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 space-y-4">
          <h3 className="text-h4 font-semibold text-text">Outstanding Debt Items</h3>
          <DataTable
            columns={columns}
            data={items}
            getRowKey={(item) => item.id}
          />
        </motion.div>

        {/* Refactoring Timeline */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 flex flex-col">
          <h3 className="text-h4 font-semibold text-text mb-4">Refactoring Roadmap</h3>
          <div className="flex-1 overflow-auto pr-1">
            <VerticalTimeline items={timelineEvents} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
