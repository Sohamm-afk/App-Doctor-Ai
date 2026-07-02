import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Activity, Clock, Server, Folder, File, Code, HelpCircle } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { DataTable } from '@/components/common/Table';
import { Badge } from '@/components/ui/Badge';
import { cn, formatBytes } from '@/utils';
import { useToast } from '@/components/ui/Toast';
import type { PerformanceMetric, TableColumn } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function PerformancePage() {
  const { id } = useParams<{ id: string }>();
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      setScanResult(JSON.parse(localScanData));
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-body-sm text-text-muted">Loading performance metrics…</span>
      </div>
    );
  }

  // Handle "Not yet analyzed" clean state
  if (!scanResult) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">Not yet analyzed</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view performance metrics.
        </p>
      </div>
    );
  }

  const rawStats = scanResult.raw_stats || {};
  const fileCount = rawStats.fileCount || 0;
  const folderCount = rawStats.folderCount || 0;
  const totalSizeBytes = rawStats.totalSize || 0;

  // 1. Estimated Bundle Size: 70% of total size is source code
  const bundleSizeBytes = Math.round(totalSizeBytes * 0.7);
  const bundleSizeStr = totalSizeBytes > 0 ? formatBytes(bundleSizeBytes) : 'Not yet analyzed';

  // 2. Project Complexity
  const complexity = fileCount > 200 ? 'High' : fileCount > 50 ? 'Medium' : fileCount > 0 ? 'Low' : 'Not yet analyzed';

  // 3. Dependency Count
  const depCount = scanResult.technology?.packageManager ? 'Detected' : 'Not yet analyzed';

  // 4. Build Complexity
  const buildComplexity = scanResult.metadata?.docker_supported ? 'Medium (Docker)' : 'Low (Standard)';

  // Map largest files to Table Column structure
  const largestFiles = (rawStats.largestFiles || []).map((file: any, idx: number) => ({
    id: `file-${idx}`,
    name: file.path,
    size: file.size,
    formattedSize: formatBytes(file.size),
  }));

  const largestFilesColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'File Name',
      render: (_, row) => (
        <span className="font-mono text-body-xs text-text break-all">{row.name}</span>
      ),
    },
    {
      key: 'size',
      header: 'File Size',
      render: (_, row) => (
        <span className="font-mono text-caption text-text-muted">{row.formattedSize}</span>
      ),
    },
  ];

  // Map performance findings to recommendations table
  const perfFindings = scanResult.performance_findings || [];
  const performanceIssues = perfFindings.map((f: any, idx: number) => ({
    id: `perf-${idx}`,
    name: f.title,
    description: f.description,
    impact: f.impact || 'Medium',
    file: f.file,
  }));

  const perfColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'Potential Bottleneck',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-text">{row.name}</p>
          <span className="text-[10px] text-text-subtle font-mono break-all">{row.file}</span>
        </div>
      ),
    },
    {
      key: 'impact',
      header: 'Impact',
      render: (_, row) => (
        <Badge variant={row.impact === 'High' ? 'critical' : 'warning'}>
          {row.impact}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Details & Recommendations',
      render: (_, row) => (
        <span className="text-body-sm text-text-muted">{row.description}</span>
      ),
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
          Review structural complexity, oversized dependency artifacts, and potential bottlenecks within the repository.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            key: 'bundle',
            title: 'Estimated Bundle Size',
            value: bundleSizeStr,
            icon: <Server size={16} />,
          },
          {
            key: 'complexity',
            title: 'Project Complexity',
            value: complexity,
            icon: <Activity size={16} />,
          },
          {
            key: 'dependencies',
            title: 'Dependency Status',
            value: depCount,
            icon: <Code size={16} />,
          },
          {
            key: 'build',
            title: 'Build Complexity',
            value: buildComplexity,
            icon: <Clock size={16} />,
          },
        ].map((card, i) => (
          <motion.div key={card.key} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <MetricCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend="stable"
              trendPositive={true}
              loading={loading}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Repository statistics */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 lg:col-span-1">
          <h3 className="text-h4 font-semibold text-text mb-4">Repository Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-body-sm text-text-muted flex items-center gap-1.5"><Folder size={14} /> Folders</span>
              <span className="font-semibold text-text">{folderCount}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-body-sm text-text-muted flex items-center gap-1.5"><File size={14} /> Files</span>
              <span className="font-semibold text-text">{fileCount}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-body-sm text-text-muted flex items-center gap-1.5"><Code size={14} /> Max Nesting Depth</span>
              <span className="font-semibold text-text">{rawStats.maxDepth || 0}</span>
            </div>
          </div>

          <h3 className="text-h4 font-semibold text-text mt-6 mb-4">Extension Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(rawStats.extensions || {}).map(([ext, count]: any) => (
              <Badge key={ext} variant="neutral">
                {ext}: {count}
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* Large Files listing */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 lg:col-span-2">
          <h3 className="text-h4 font-semibold text-text mb-4">Oversized / Large Files</h3>
          {largestFiles.length === 0 ? (
            <p className="text-body-sm text-text-muted italic">No files checked.</p>
          ) : (
            <DataTable
              columns={largestFilesColumns}
              data={largestFiles}
              loading={loading}
              getRowKey={(row) => row.id}
            />
          )}
        </motion.div>
      </div>

      {/* Details Table */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
        <h3 className="text-h4 font-semibold text-text">Performance Bottlenecks & Recommendations</h3>
        {performanceIssues.length === 0 ? (
          <div className="card p-6 text-center text-body-sm text-text-muted italic">
            No performance bottlenecks detected. Keep your dependencies optimized.
          </div>
        ) : (
          <DataTable
            columns={perfColumns}
            data={performanceIssues}
            loading={loading}
            getRowKey={(row) => row.id}
          />
        )}
      </motion.div>
    </div>
  );
}
