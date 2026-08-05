import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Hammer, ShieldAlert, CheckCircle, Eye, Info, ListTodo, Map } from 'lucide-react';
import { MetricCard } from '@/components/cards/Cards';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { SkeletonCard, ProgressBar } from '@/components/ui/Loading';
import { formatNumber } from '@/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function TechnicalDebtPage() {
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

      const rawStats = scanData.raw_stats || {};
      const qualityFindings = scanData.quality_findings || [];
      const profile = scanData.repositoryProfile || {};

      const mappedIssues = qualityFindings.map((f: any, idx: number) => {
        const isDep = f.title.toLowerCase().includes('deprecat') || f.title.toLowerCase().includes('outdate') || f.title.toLowerCase().includes('version');
        const isTest = f.title.toLowerCase().includes('test') || f.title.toLowerCase().includes('spec') || f.title.toLowerCase().includes('coverage');
        const isComplex = f.title.toLowerCase().includes('complex') || f.title.toLowerCase().includes('nested') || f.title.toLowerCase().includes('long');

        return {
          id: `debt-${idx}`,
          title: f.title,
          description: f.description,
          severity: f.severity || 'medium',
          file: f.file || 'codebase',
          confidence: 'high',
          estimatedFixTime: f.severity === 'high' ? '4 hours' : '2 hours',
          category: isDep ? 'Dependency Health' : isTest ? 'Testing Coverage' : 'Code Complexity',
          impact: {
            whyItMatters: isDep
              ? 'Outdated or deprecated package dependencies block upgrading to newer frameworks and present security risks.'
              : isTest
              ? 'Low automated testing coverage makes refactoring unsafe and increases regression rates.'
              : 'High structural code complexity blocks code readability and increases onboarding latency.',
            businessImpact: isDep
              ? 'Difficulty maintaining stable third-party packages, leading to security compliance failures.'
              : 'Regressions and features breaking in production when developer changes are merged.'
          },
          recommendedFix: isDep
            ? `Upgrade dependencies in package configs. Audit and pin LTS library versions.`
            : isTest
            ? `Implement JEST unit test specifications for files with high complexity parameters.`
            : `Flatten control flows. Decouple nested loops and classes into modular routines.`
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
        <span className="text-body-sm text-text-muted">Loading technical debt metrics…</span>
      </div>
    );
  }

  if (!scanResult) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">Not yet analyzed</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view technical debt metrics.
        </p>
      </div>
    );
  }

  const rawStats = scanResult.raw_stats || {};
  const fileCount = rawStats.fileCount || 0;
  const criticalDebt = issues.filter(i => i.severity === 'high').length;
  const totalHours = issues.reduce((sum, item) => sum + (item.severity === 'high' ? 4 : 2), 0);

  const score = Math.max(0, 100 - issues.length * 8);
  let rating = 'A';
  if (score < 60) rating = 'D';
  else if (score < 80) rating = 'C';
  else if (score < 90) rating = 'B';

  const hasTests = scanResult.repositoryProfile?.hasTests;

  // Maintainability Breakdown
  const maintainabilityFactors = [
    { name: 'Architecture Pattern', status: 'Clean Layer separation', variant: 'success' },
    { name: 'Code Complexity', status: fileCount > 100 ? 'Review Needed' : 'Optimized', variant: fileCount > 100 ? 'warning' : 'success' },
    { name: 'Test Coverage', status: hasTests ? 'Configured' : 'Missing Test Suits', variant: hasTests ? 'success' : 'warning' },
    { name: 'Dependency Health', status: issues.some(i => i.category === 'Dependency Health') ? 'Upgrade Needed' : 'Healthy', variant: issues.some(i => i.category === 'Dependency Health') ? 'warning' : 'success' }
  ];

  // Roadmap list
  const roadmapItems = [
    { priority: 'P1', title: 'Implement missing Test Coverage', impact: 'Prevents release regressions', effort: 'Medium', risk: 'High Reduction', fix: 'Write JEST unit test suites.' },
    { priority: 'P2', title: 'Upgrade deprecated dependencies', impact: 'Cleans code vulnerability risks', effort: 'Low', risk: 'Medium Reduction', fix: 'Update packages to LTS.' },
    { priority: 'P3', title: 'Refactor complex controller routes', impact: 'Improves onboarding velocity', effort: 'High', risk: 'Low Reduction', fix: 'Flatten nested control structures.' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={22} className="text-amber-500" />
            <h1 className="font-heading text-h1 text-text font-bold">Technical Debt Intelligence</h1>
          </div>
          <p className="text-body-sm text-text-muted">
            Track code quality issues, deprecated dependency flags, test gaps, and design-pattern violations.
          </p>
        </div>
      </div>

      {/* Executive Technical Debt Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Score block */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-bg-card to-amber-500/5">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Code Quality Score</span>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-h1 font-heading font-black text-text">{score}</span>
            <span className="text-body-xs text-text-muted">/ 100</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-caption text-text-muted">Maintainability Rating:</span>
            <Badge variant={score >= 80 ? 'success' : 'warning'} size="sm" className="font-bold">
              Rating {rating}
            </Badge>
          </div>
        </div>

        {/* Counters */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Technical Debt Index</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Estimated Cleanup</span>
              <span className="text-body-xs font-bold text-text block mt-1 truncate">{totalHours} hours</span>
            </div>
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Critical Debt Items</span>
              <span className="text-body-md font-bold text-text block mt-1">{criticalDebt}</span>
            </div>
            <div className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
              <span className="text-caption text-text-muted block">Maintainability Risk</span>
              <span className="text-body-xs font-bold text-text block mt-1 truncate">
                {score >= 80 ? 'Low Risk' : 'Moderate Risk'}
              </span>
            </div>
          </div>
        </div>

        {/* Release Verdict */}
        <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-bg-card to-purple-500/5 border-l-4 border-l-purple-500">
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">CTO Refactoring Release Gate</span>
          <div className="my-3">
            <span className="text-body font-bold text-text block">
              {score >= 85 ? 'Healthy Codebase' : 'Refactoring Campaign Advised'}
            </span>
            <span className="text-caption text-text-muted">
              {score >= 85 ? 'Clean Maintainability standards.' : 'Resolve package deprecations first.'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-caption text-text-muted">
            <Clock size={12} className="text-primary-500" />
            <span>Total items flagged: {issues.length}</span>
          </div>
        </div>
      </div>

      {/* Maintainability breakdown & roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Maintainability breakdown */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Info size={16} className="text-primary-500" />
            <h3 className="text-body font-bold text-text">Maintainability Factors</h3>
          </div>
          <div className="space-y-3">
            {maintainabilityFactors.map((mf) => (
              <div key={mf.name} className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0 text-caption">
                <span className="text-text font-medium">{mf.name}</span>
                <Badge variant={mf.variant as any} size="xs">{mf.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Engineering Roadmap */}
        <div className="card p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Map size={16} className="text-purple-500" />
            <h3 className="text-body font-bold text-text">Prioritized Engineering Roadmap</h3>
          </div>
          <div className="space-y-3">
            {roadmapItems.map((item) => (
              <div key={item.priority} className="p-3 bg-bg-subtle/50 rounded-lg border border-border/40 flex justify-between items-center text-caption gap-4">
                <div>
                  <span className="font-bold text-text flex items-center gap-1">
                    <Badge variant="primary" size="xs">{item.priority}</Badge>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">{item.impact}</span>
                </div>
                <div className="text-right shrink-0 text-[10px]">
                  <span className="text-emerald-500 font-bold block">{item.risk}</span>
                  <span className="text-text-muted block">Effort: {item.effort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Technical Debt Detailed Review */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <ListTodo size={16} className="text-amber-500" />
            <h3 className="text-body font-bold text-text">Outstanding Refactoring Queue</h3>
          </div>
          <Badge variant="primary">{issues.length} items</Badge>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 border border-dashed border-border text-center flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 mb-3 shadow-sm">
              <CheckCircle size={20} />
            </div>
            <h4 className="text-body font-semibold text-text mb-1">
              No technical debt flagged.
            </h4>
            <p className="text-caption text-text-muted max-w-md">
              Congratulations! Your repository matches clean maintainability patterns, dependency standards, and testing criteria.
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
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block font-semibold text-emerald-500">Why It Matters</span>
                    <p className="text-text leading-relaxed">{selectedIssue.impact.whyItMatters}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Business Impact</span>
                    <p className="text-text-muted leading-relaxed italic">{selectedIssue.impact.businessImpact}</p>
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
                  <span>Select a code quality finding to review details</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
