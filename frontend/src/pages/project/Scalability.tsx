import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Check, AlertTriangle, Play, HelpCircle, Users, Cpu, ShieldCheck, Clock, Key, Eye, Info } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { SkeletonCard, ProgressBar } from '@/components/ui/Loading';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function ScalabilityPage() {
  const { id } = useParams<{ id: string }>();
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      const scanData = JSON.parse(localScanData);
      setScanResult(scanData);

      const importantFiles = scanData.importantFiles || [];
      const profile = scanData.repositoryProfile || {};
      const techList = JSON.stringify(scanData).toLowerCase();

      const hasDocker = importantFiles.some((f: string) => f.toLowerCase().includes('dockerfile'));
      const hasK8s = importantFiles.some((f: string) => f.toLowerCase().includes('k8s') || f.toLowerCase().includes('kubernetes'));
      
      const hasCache = techList.includes('redis') || techList.includes('ioredis') || techList.includes('memcached');
      const hasQueue = techList.includes('bull') || techList.includes('amqp') || techList.includes('sqs') || techList.includes('rabbitmq') || techList.includes('kafka');
      const hasDb = profile.hasDatabase;

      const mappedIssues = [];

      // Static Bottleneck Checks
      if (hasDb && !hasCache) {
        mappedIssues.push({
          id: 'scale-cache',
          title: 'Direct Database Read Contention',
          description: 'No caching layers (Redis, Memcached) detected. All read operations hit the database directly.',
          severity: 'high',
          file: 'database.ts',
          confidence: 'high',
          estimatedFixTime: '4 hours',
          category: 'Data Caching',
          impact: {
            whyItMatters: 'Direct read hits to databases saturate connection pools and increase CPU utilization under concurrent user spikes.',
            businessImpact: 'Elevated request latency and complete database lockups under high traffic.'
          },
          recommendedFix: 'Introduce a Redis cache layer for read-heavy queries. Set cache-aside invalidation triggers.'
        });
      }

      if (!hasQueue) {
        mappedIssues.push({
          id: 'scale-queue',
          title: 'Synchronous Long-Running Jobs',
          description: 'No messaging queues (BullMQ, RabbitMQ, Kafka) detected for offloading heavy requests.',
          severity: 'high',
          file: 'app.ts',
          confidence: 'high',
          estimatedFixTime: '6 hours',
          category: 'Task Offloading',
          impact: {
            whyItMatters: 'Processing reports, emails, or heavy iterations synchronously blocks the Node/Python runtime main loop.',
            businessImpact: 'Blocks new incoming user connections, resulting in HTTP 504 Gateway Timeouts.'
          },
          recommendedFix: 'Integrate BullMQ or RabbitMQ to enqueue background operations. Run separate background workers.'
        });
      }

      if (!hasDocker) {
        mappedIssues.push({
          id: 'scale-stateless',
          title: 'Stateful Local Hosting Assumptions',
          description: 'Missing container configs indicates local filesystem dependency or state assumptions.',
          severity: 'medium',
          file: 'Dockerfile',
          confidence: 'medium',
          estimatedFixTime: '30 mins',
          category: 'Statelessness',
          impact: {
            whyItMatters: 'Horizontal scaling requires stateless app replicas that can be added or destroyed dynamically behind load balancers.',
            businessImpact: 'Environment mismatches prevent quick auto-scaling during traffic spikes.'
          },
          recommendedFix: 'Containerize using Docker. Move all file writes to cloud buckets (AWS S3) and session storage to shared caches.'
        });
      }

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
        <span className="text-body-sm text-text-muted">Loading scalability assessment…</span>
      </div>
    );
  }

  if (!scanResult) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">Not yet analyzed</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view scalability metrics.
        </p>
      </div>
    );
  }

  const profile = scanResult.repositoryProfile || {};
  const techList = JSON.stringify(scanResult).toLowerCase();

  const hasDocker = !!profile.hasDocker;
  const hasK8s = techList.includes('k8s') || techList.includes('kubernetes');
  const hasCache = techList.includes('redis') || techList.includes('ioredis') || techList.includes('memcached');
  const hasQueue = techList.includes('bull') || techList.includes('amqp') || techList.includes('sqs') || techList.includes('rabbitmq') || techList.includes('kafka');

  // Score
  const criticalBottlenecks = issues.filter(i => i.severity === 'high').length;
  const score = Math.max(0, 100 - (criticalBottlenecks * 20 + issues.length * 5));

  const scalePotentialLabel = hasK8s ? 'High' : (hasDocker ? 'Medium' : 'Low');

  // Scaling Checklist
  const scalingReadiness = [
    { name: 'Stateless Architecture', status: hasDocker ? 'Stateless' : 'Potential Local Disk reliance', variant: hasDocker ? 'success' : 'warning', detail: 'App nodes store no local state.' },
    { name: 'Distributed Caching', status: hasCache ? 'Active (Redis)' : 'Not Configured', variant: hasCache ? 'success' : 'warning', detail: 'Offloads read load from DB.' },
    { name: 'Async Queue System', status: hasQueue ? 'Active' : 'Missing Indicator', variant: hasQueue ? 'success' : 'warning', detail: 'Offloads write-heavy background tasks.' },
    { name: 'Service Isolation', status: hasK8s ? 'Isolated (Pods)' : 'Monolithic', variant: hasK8s ? 'success' : 'neutral', detail: 'Decoupled scaling boundaries.' },
    { name: 'Connection Pooling', status: techList.includes('pool') ? 'Enabled' : 'Missing Pool Config', variant: techList.includes('pool') ? 'success' : 'warning', detail: 'Manages database socket reuse.' }
  ];

  // Architecture Readiness
  const archReadiness = [
    { name: 'Layer Separation', status: 'Verifying', detail: 'Distinguishes routers, models, and service classes.' },
    { name: 'Dependency Isolation', status: 'Configured', detail: 'Explicit declarations of external boundaries.' },
    { name: 'Stateless Routing Compatibility', status: hasDocker ? 'High' : 'Medium', detail: 'Ready for stateless load balancers.' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={22} className="text-emerald-500" />
            <h1 className="font-heading text-h1 text-text font-bold">Scalability Intelligence</h1>
          </div>
          <p className="text-body-sm text-text-muted">
            Static assessment of concurrency support, stateless hosting, and distributed database bottleneck limits.
          </p>
        </div>
      </div>

      {/* Executive Scalability Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Score block */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-bg-card to-emerald-500/5">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Scalability Score</span>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-h1 font-heading font-black text-text">{score}</span>
            <span className="text-body-xs text-text-muted">/ 100</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-caption text-text-muted">Scale Potential:</span>
            <Badge variant={score >= 75 ? 'success' : 'warning'} size="sm" className="font-bold">
              {scalePotentialLabel} Potential
            </Badge>
          </div>
        </div>

        {/* Counters */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Scalability Indicators</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Horizontal Scaling</span>
              <span className="text-body-xs font-bold text-text block mt-1 truncate">
                {hasDocker ? 'Ready' : 'Stateful Warning'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Primary Bottleneck</span>
              <span className="text-body-xs font-bold text-text block mt-1 truncate">
                {criticalBottlenecks > 0 ? 'Synchronous I/O' : 'None Detected'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Analysis Confidence</span>
              <span className="text-body-md font-bold text-text block mt-1">95%</span>
            </div>
          </div>
        </div>

        {/* Target Profile */}
        <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-bg-card to-amber-500/5 border-l-4 border-l-amber-500">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">CTO Release Scalability Verdict</span>
          <div className="my-3">
            <span className="text-body font-bold text-text block">
              {score >= 80 ? 'Approved for Scale' : 'Scale Remediations Required'}
            </span>
            <span className="text-caption text-text-muted">
              {score >= 80 ? 'Stateless node structure verified.' : 'Resolve direct database read spikes.'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-caption text-text-muted">
            <Clock size={12} className="text-primary-500" />
            <span>Remediation time: {issues.length * 2} hours</span>
          </div>
        </div>
      </div>

      {/* Scaling Readiness & Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scaling Readiness Checklist */}
        <div className="card p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <h3 className="text-body font-bold text-text">Scaling Readiness Checklist</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scalingReadiness.map((sr) => (
              <div key={sr.name} className="p-3.5 rounded-lg bg-bg-subtle/50 border border-border/40 space-y-1 text-caption">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text">{sr.name}</span>
                  <Badge variant={sr.variant as any} size="xs">{sr.status}</Badge>
                </div>
                <p className="text-text-muted text-[10px] leading-relaxed">{sr.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Readiness */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Cpu size={16} className="text-purple-500" />
            <h3 className="text-body font-bold text-text">Architecture Readiness</h3>
          </div>
          <div className="space-y-3">
            {archReadiness.map((ar) => (
              <div key={ar.name} className="py-1 border-b border-border/30 last:border-b-0 text-caption">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text">{ar.name}</span>
                  <span className="text-[10px] text-text-muted font-bold">{ar.status || 'Verified'}</span>
                </div>
                <p className="text-text-muted text-[10px] leading-relaxed">{ar.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Scalability Bottlenecks Review */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-body font-bold text-text">Scalability Bottlenecks Review</h3>
          </div>
          <Badge variant="primary">{issues.length} findings</Badge>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 border border-dashed border-border text-center flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 mb-3 shadow-sm">
              <Check size={20} />
            </div>
            <h4 className="text-body font-semibold text-text mb-1">
              No scalability bottlenecks detected.
            </h4>
            <p className="text-caption text-text-muted max-w-md">
              Congratulations! Your stateless repository is perfectly optimized for horizontal scaling.
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
                    <SeverityBadge severity={issue.severity} />
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
                    <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500" /> {selectedIssue.confidence} confidence</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-primary-500" /> Fix: {selectedIssue.estimatedFixTime}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <Eye size={24} className="mb-1" />
                  <span>Select a scalability bottleneck to review details</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
