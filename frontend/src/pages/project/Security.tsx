import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Filter } from 'lucide-react';
import { SecurityCard } from '@/components/cards/Cards';
import { EmptyState } from '@/components/common/EmptyState';
import { DataTable } from '@/components/common/Table';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Loading';
import { mockService } from '@/services/mock';
import { formatRelativeTime } from '@/utils';
import { useToast } from '@/components/ui/Toast';
import type { SecurityIssue, Severity } from '@/types';
import type { TableColumn } from '@/types';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export default function SecurityPage() {
  const { id } = useParams<{ id: string }>();
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const { error } = useToast();

  useEffect(() => {
    if (!id) return;
    mockService.getSecurityIssues(id)
      .then((data) => {
        setIssues(data);
        setLoading(false);
      })
      .catch((err) => {
        error('Failed to load security issues', err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [id, error]);

  const filtered = filter === 'all'
    ? issues
    : issues.filter((i) => i.severity === filter);

  const columns: TableColumn<SecurityIssue>[] = [
    { key: 'severity', header: 'Severity', sortable: true, width: '120px',
      render: (_, row) => <SeverityBadge severity={row.severity} /> },
    { key: 'title',    header: 'Issue',    sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-text">{row.title}</p>
          {row.filePath && (
            <code className="text-caption text-secondary-500 font-mono">{row.filePath}{row.lineNumber ? `:${row.lineNumber}` : ''}</code>
          )}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (_, row) => (
        <Badge variant="neutral" size="xs">{row.category}</Badge>
      ),
    },
    { key: 'status',   header: 'Status', sortable: true,
      render: (_, row) => (
        <Badge
          variant={row.status === 'resolved' ? 'success' : row.status === 'in-progress' ? 'info' : 'neutral'}
          size="xs"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    { key: 'createdAt', header: 'Found', sortable: true,
      render: (_, row) => <span className="text-text-muted">{formatRelativeTime(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-red-500" />
            <h1 className="font-heading text-h1 text-text">Security</h1>
          </div>
          <p className="text-body-sm text-text-muted">{loading ? '…' : `${issues.length} vulnerabilities detected`}</p>
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {(['all', ...SEVERITY_ORDER] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(sev)}
            className={`px-3 py-1.5 rounded-full text-caption font-medium border transition-all ${
              filter === sev
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-bg-card border-border text-text-muted hover:border-secondary-300'
            }`}
          >
            {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            {sev !== 'all' && ` (${issues.filter(i => i.severity === sev).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState variant="no-security" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DataTable<SecurityIssue>
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            stickyHeader
          />
        </motion.div>
      )}
    </div>
  );
}
