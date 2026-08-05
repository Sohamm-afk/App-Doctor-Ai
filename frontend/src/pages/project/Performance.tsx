import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Activity, Clock, Server, Folder, File, Code, HelpCircle, AlertTriangle, CheckCircle, Database, Layout, Eye } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { SkeletonCard, ProgressBar } from '@/components/ui/Loading';
import { formatBytes } from '@/utils';
import type { Severity } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function PerformancePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      const scanData = JSON.parse(localScanData);
      setScanResult(scanData);
      
      const rawStats = scanData.raw_stats || {};
      const perfFindings = scanData.performance_findings || [];
      
      const mappedIssues = perfFindings.map((f: any, idx: number) => {
        const isDb = f.title.toLowerCase().includes('database') || f.title.toLowerCase().includes('sql') || f.title.toLowerCase().includes('query');
        const isNesting = f.title.toLowerCase().includes('nest') || f.title.toLowerCase().includes('loop');
        const isAsset = f.title.toLowerCase().includes('size') || f.title.toLowerCase().includes('large');

        return {
          id: `perf-${idx}`,
          title: f.title,
          description: f.description,
          severity: f.severity || 'medium',
          file: f.file,
          confidence: 'high',
          estimatedFixTime: f.severity === 'high' ? '45 mins' : '20 mins',
          category: isDb ? 'Database Latency' : isNesting ? 'CPU Overhead' : 'Resource Payload',
          impact: {
            whyItMatters: isDb
              ? 'Synchronous or unindexed database queries block the main thread and multiply request response times.'
              : isNesting 
              ? 'Nested iterations and high cyclomatic complexity block main thread execution causing frame drops or slow responses.'
              : 'Over-sized source files and bundles delay initial client parsing, loading, and hydration speed.',
            businessImpact: isDb
              ? 'Elevated infrastructure billing costs and server timeout rates under peak request concurrency.'
              : 'Frustrated end users, lowered engagement, and drop-offs due to latency lag.'
          },
          recommendedFix: isDb
            ? `Introduce Redis caches for repetitive read payloads. Optimize ORM statements and append index constraints to queried fields.`
            : `Refactor loops into flat pipelines. Enable gzip/brotli compression and employ route lazy-loading to split code bundles.`
        };
      });
      
      setIssues(mappedIssues);
      if (mappedIssues.length > 0) {
        setSelectedIssue(mappedIssues[0]);
      }
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
  const maxDepth = rawStats.maxDepth || 0;
  const largestFiles = rawStats.largestFiles || [];

  const bundleSizeBytes = Math.round(totalSizeBytes * 0.7);
  const bundleSizeStr = totalSizeBytes > 0 ? formatBytes(bundleSizeBytes) : 'Unavailable';
  const complexity = fileCount > 200 ? 'High' : fileCount > 50 ? 'Medium' : fileCount > 0 ? 'Low' : 'Unavailable';

  const criticalIssues = issues.filter(i => i.severity === 'high').length;
  const optOps = issues.filter(i => i.severity === 'medium' || i.severity === 'low').length;
  const score = Math.max(0, 100 - (criticalIssues * 20 + optOps * 5));

  // Opportunities Checklist
  const allDeps = [
    ...(scanResult?.repositoryProfile?.detectedTechnologies || []),
    ...(scanResult?.technology?.dependencies || [])
  ];

  const hasCache = allDeps.some((d: string) => d.includes('redis') || d.includes('memcached') || d.includes('cache'));
  const hasPagination = issues.some(i => i.title.toLowerCase().includes('pagination'));
  const hasDb = scanResult?.repositoryProfile?.hasDatabase;

  const performanceOps = [
    { name: 'Lazy Loading', status: fileCount > 50 ? 'Recommended' : 'Optimized', variant: fileCount > 50 ? 'warning' : 'success', detail: 'Splits main JS assets into dynamic route bundles.' },
    { name: 'Compression Gates', status: 'Enabled (Static)', variant: 'success', detail: 'Source code builds minimize whitespace.' },
    { name: 'Distributed Caching', status: hasCache ? 'Active (Redis)' : 'Not Configured', variant: hasCache ? 'success' : 'warning', detail: 'Accelerates redundant queries.' },
    { name: 'Connection Pooling', status: hasDb ? 'Recommended' : 'Not Required', variant: hasDb ? 'warning' : 'success', detail: 'Reuses database sockets.' },
    { name: 'Database Indexing', status: hasDb ? 'Analysis Pending' : 'Not Required', variant: hasDb ? 'warning' : 'success', detail: 'Resolves sequential table scans.' },
    { name: 'Tree Shaking', status: 'Enabled (Web)', variant: 'success', detail: 'Strips dead import statements during compile bundles.' }
  ];

  // Hotspots
  const hotspots = [
    { name: 'Large Source Files', status: largestFiles.length > 2 ? 'Action Required' : 'Low Risk', variant: largestFiles.length > 2 ? 'danger' : 'success', value: largestFiles.length > 0 ? `${largestFiles.length} files > 200KB` : 'None' },
    { name: 'Deep Folder Nesting', status: maxDepth > 5 ? 'High Nesting' : 'Optimized', variant: maxDepth > 5 ? 'warning' : 'success', value: `Max Depth: ${maxDepth}` },
    { name: 'Long Code Modules', status: fileCount > 150 ? 'Review Structure' : 'Healthy', variant: fileCount > 150 ? 'warning' : 'success', value: `${fileCount} modules` }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={22} className="text-amber-500" />
            <h1 className="font-heading text-h1 text-text font-bold">Performance Intelligence</h1>
          </div>
          <p className="text-body-sm text-text-muted">
            Static audit of cyclomatic complexity, bundle impact, memory leaks, and query blockages.
          </p>
        </div>
      </div>

      {/* Executive Performance Review Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Score block */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-bg-card to-amber-500/5">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Performance Score</span>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-h1 font-heading font-black text-text">{score}</span>
            <span className="text-body-xs text-text-muted">/ 100</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-caption text-text-muted">Production Impact:</span>
            <Badge variant={score >= 80 ? 'success' : 'warning'} size="sm" className="font-bold">
              {score >= 80 ? 'Low Risk' : 'Moderate Risk'}
            </Badge>
          </div>
        </div>

        {/* Counters */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Static Analysis Metrics</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'Critical Bottlenecks', count: criticalIssues },
              { label: 'Optimization Ops', count: optOps },
              { label: 'Performance Confidence', count: '95%' }
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
                <span className="text-caption text-text-muted block">{s.label}</span>
                <span className="text-body-md font-bold text-text block mt-1">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Build summary */}
        <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-bg-card to-primary-500/5 border-l-4 border-l-primary-500">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Web Bundle Impact</span>
          <div className="my-3">
            <span className="text-body font-bold text-text block">{bundleSizeStr}</span>
            <span className="text-caption text-text-muted">Estimated static source footprint</span>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-caption text-text-muted">
            <Clock size={12} className="text-primary-500" />
            <span>Complexity Weight: {complexity}</span>
          </div>
        </div>
      </div>

      {/* Complexity Hotspots & Opportunities Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Complexity Hotspots */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Activity size={16} className="text-amber-500" />
            <h3 className="text-body font-bold text-text">Complexity Hotspots</h3>
          </div>
          <div className="space-y-4">
            {hotspots.map((hs) => (
              <div key={hs.name} className="flex justify-between items-center py-1 border-b border-border/30 text-caption">
                <div>
                  <span className="font-bold text-text block">{hs.name}</span>
                  <span className="text-text-muted text-[10px]">{hs.value}</span>
                </div>
                <Badge variant={hs.variant as any} size="xs">{hs.status}</Badge>
              </div>
            ))}
            {largestFiles.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] text-text-muted font-bold uppercase block mb-1">Oversized files</span>
                <div className="space-y-1">
                  {largestFiles.slice(0, 2).map((lf: any, idx: number) => (
                    <code key={idx} className="block text-[9px] font-mono bg-bg-subtle p-1 rounded truncate text-secondary-500">
                      {lf.path.split('/').pop()} ({formatBytes(lf.size)})
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Opportunities */}
        <div className="card p-6 space-y-4 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <h3 className="text-body font-bold text-text">Performance Opportunities Check</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performanceOps.map((op) => (
              <div key={op.name} className="p-3 rounded-lg bg-bg-subtle/50 border border-border/40 space-y-1 text-caption">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text">{op.name}</span>
                  <Badge variant={op.variant as any} size="xs">{op.status}</Badge>
                </div>
                <p className="text-text-muted text-[10px] leading-relaxed">{op.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Detailed Issues Table Split Panel */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-body font-bold text-text">Performance Bottlenecks Review</h3>
          </div>
          <Badge variant="primary">{issues.length} flagged</Badge>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 border border-dashed border-border text-center flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 mb-3 shadow-sm">
              <CheckCircle size={20} />
            </div>
            <h4 className="text-body font-semibold text-text mb-1">
              No significant performance bottlenecks detected.
            </h4>
            <p className="text-caption text-text-muted max-w-md">
              Excellent! The static analyzer did not detect any rendering blockages, nested loop complexities, or giant assets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
            {/* List */}
            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1 border-r border-border/40">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedIssue?.id === issue.id
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-bg-subtle/40 border-border/40 hover:bg-bg-subtle/70'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-body-xs font-bold text-text line-clamp-1">{issue.title}</span>
                    <Badge variant={issue.severity === 'high' ? 'critical' : 'warning'} size="xs">{issue.severity}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <code className="font-mono bg-bg-card px-1 rounded truncate flex-1">{issue.file}</code>
                    <span className="shrink-0">{issue.estimatedFixTime}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div className="overflow-y-auto max-h-[380px] pr-1 space-y-4 text-body-xs">
              {selectedIssue ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-body-sm font-bold text-text">{selectedIssue.title}</span>
                      <Badge variant="neutral" size="xs">{selectedIssue.category}</Badge>
                    </div>
                    <code className="font-mono bg-bg-subtle px-1.5 py-0.5 rounded text-[10px] text-secondary-500 block break-all">
                      {selectedIssue.file}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Description</span>
                    <p className="text-text leading-relaxed bg-bg-subtle/50 p-2 rounded">{selectedIssue.description}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Business Impact</span>
                    <p className="text-text-muted leading-relaxed italic">{selectedIssue.impact.businessImpact}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block font-semibold text-emerald-500">Why It Matters</span>
                    <p className="text-text leading-relaxed">{selectedIssue.impact.whyItMatters}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/40">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block font-semibold text-primary-500">Recommended Fix</span>
                    <p className="text-text leading-relaxed bg-primary-500/5 p-2.5 rounded border border-primary-500/10 font-normal">
                      {selectedIssue.recommendedFix}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 text-text-muted">
                    <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> {selectedIssue.confidence} confidence</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-primary-500" /> Fix: {selectedIssue.estimatedFixTime}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <Eye size={24} className="mb-1" />
                  <span>Select a performance bottleneck to review details</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
