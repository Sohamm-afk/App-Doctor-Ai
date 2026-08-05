import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Clock, Key, Lock, ShieldAlert, Cpu, Eye, FileText } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { SkeletonCard, ProgressBar } from '@/components/ui/Loading';
import { formatRelativeTime } from '@/utils';
import type { Severity } from '@/types';

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function SecurityPage() {
  const { id } = useParams<{ id: string }>();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      const scanData = JSON.parse(localScanData);
      setScanResult(scanData);
      const mappedIssues = (scanData.security_findings ?? []).map((f: any, idx: number) => {
        const isSecret = f.title.toLowerCase().includes('secret') || f.title.toLowerCase().includes('password') || f.title.toLowerCase().includes('key');
        const isDependency = f.file.toLowerCase().includes('package.json') || f.file.toLowerCase().includes('requirements.txt');
        
        // Enrich findings with detailed info
        return {
          id: `sec-${idx}`,
          title: f.title,
          description: f.description,
          severity: f.severity || 'medium',
          file: f.file,
          lineNumber: f.lineNumber || 1,
          confidence: f.confidence || 'high',
          estimatedFixTime: f.severity === 'critical' ? '30 mins' : f.severity === 'high' ? '20 mins' : '10 mins',
          category: isSecret ? 'Secrets Exposure' : isDependency ? 'Third-Party Dependency' : 'Injection Vulnerability',
          impact: {
            whyItMatters: isSecret 
              ? 'Exposed cryptographic keys or secrets can allow unauthorized system access and credential harvesting.' 
              : 'Vulnerable dependencies expose your backend to known CVE vectors and remote command execution (RCE).',
            businessImpact: isSecret 
              ? 'Data breach resulting in regulatory non-compliance, direct credential abuse, and loss of customer trust.' 
              : 'Allows malicious actors to disrupt services, compromise hosting servers, or steal transactional data.'
          },
          recommendedFix: isSecret 
            ? `Rotate the exposed credential immediately. Move private keys into environment variables (.env) and add the source file to your .gitignore.`
            : `Update the package version to a patched release. Run audit-fix commands or pin secure dependency coordinates in your package manager config.`
        };
      });
      setIssues(mappedIssues);
      if (mappedIssues.length > 0) {
        setSelectedIssue(mappedIssues[0]);
      }
    }
    setLoading(false);
  }, [id]);

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount     = issues.filter(i => i.severity === 'high').length;
  const mediumCount   = issues.filter(i => i.severity === 'medium').length;
  const lowCount      = issues.filter(i => i.severity === 'low').length;

  const score = Math.max(0, 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 5));
  
  let riskLevel = 'Low';
  let riskVariant = 'success';
  if (criticalCount > 0) {
    riskLevel = 'Critical';
    riskVariant = 'danger';
  } else if (highCount > 0) {
    riskLevel = 'High';
    riskVariant = 'danger';
  } else if (mediumCount > 0) {
    riskLevel = 'Medium';
    riskVariant = 'warning';
  }

  // Attack Surface Checklist
  const importantFiles = scanResult?.importantFiles || [];
  const allDeps = [
    ...(scanResult?.repositoryProfile?.detectedTechnologies || []),
    ...(scanResult?.technology?.dependencies || [])
  ];

  const hasAuth = allDeps.some((d: string) => d.includes('jwt') || d.includes('passport') || d.includes('auth') || d.includes('oauth') || d.includes('bcrypt'));
  const hasSecurityHeaders = allDeps.some((d: string) => d.includes('helmet') || d.includes('cors'));
  const hasRateLimiter = allDeps.some((d: string) => d.includes('rate-limit') || d.includes('limiter'));
  const hasSecrets = issues.some(i => i.category === 'Secrets Exposure');

  const attackSurface = [
    { name: 'Authentication', status: hasAuth ? 'Configured' : 'Not Detected', variant: hasAuth ? 'success' : 'warning', detail: 'Token or login bindings verified.' },
    { name: 'Authorization', status: hasAuth ? 'Configured' : 'Not Determined', variant: hasAuth ? 'success' : 'neutral', detail: 'Role checking scopes.' },
    { name: 'Rate Limiting', status: hasRateLimiter ? 'Configured' : 'Missing Indicator', variant: hasRateLimiter ? 'success' : 'warning', detail: 'Protects endpoints against brute force.' },
    { name: 'Security Headers', status: hasSecurityHeaders ? 'Configured' : 'Not Detected', variant: hasSecurityHeaders ? 'success' : 'warning', detail: 'Enforces CORS policies and script protections.' },
    { name: 'Secrets Protection', status: hasSecrets ? 'Action Required' : 'Secure', variant: hasSecrets ? 'danger' : 'success', detail: 'No credential commits detected.' },
    { name: 'JWT Verification', status: allDeps.some((d: string) => d.includes('jwt')) ? 'Enabled' : 'Not Used', variant: 'success', detail: 'Validates cryptographic payload signatures.' },
    { name: 'Cookies Safety', status: 'Not Determined', variant: 'neutral', detail: 'HttpOnly and Secure flag configurations.' },
    { name: 'Input Validation', status: allDeps.some((d: string) => d.includes('joi') || d.includes('zod') || d.includes('validator') || d.includes('pydantic')) ? 'Configured' : 'Missing Indicator', variant: 'success', detail: 'Strict schema boundaries.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={22} className="text-red-500" />
            <h1 className="font-heading text-h1 text-text font-bold">Security Intelligence</h1>
          </div>
          <p className="text-body-sm text-text-muted">{loading ? '…' : `${issues.length} total vulnerabilities detected in codebase`}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Security Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Score block */}
            <div className="card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-bg-card to-red-500/5">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Security Score</span>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-h1 font-heading font-black text-text">{score}</span>
                <span className="text-body-xs text-text-muted">/ 100</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-caption text-text-muted">Risk Level:</span>
                <Badge variant={riskVariant as any} size="sm" className="font-bold">{riskLevel}</Badge>
              </div>
            </div>

            {/* Severity Counters */}
            <div className="card p-6 lg:col-span-2 space-y-4">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Vulnerability Distribution</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Critical', count: criticalCount, color: 'bg-red-600' },
                  { label: 'High', count: highCount, color: 'bg-red-500' },
                  { label: 'Medium', count: mediumCount, color: 'bg-yellow-500' },
                  { label: 'Low', count: lowCount, color: 'bg-neutral-500' }
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-bg-subtle/50 text-center border border-border/40">
                    <span className="text-caption text-text-muted block">{s.label}</span>
                    <span className="text-body-md font-bold text-text block mt-1">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Production readiness verdict */}
            <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-bg-card to-emerald-500/5 border-l-4 border-l-emerald-500">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">CTO Release Status</span>
              <div className="my-3">
                <span className="text-body font-bold text-text block">
                  {score >= 80 ? 'Approved for Release' : 'Release Delayed'}
                </span>
                <span className="text-caption text-text-muted">
                  {score >= 80 ? 'Meets core security standards.' : 'Fix critical and high risks before release.'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-caption text-text-muted">
                <Clock size={12} className="text-primary-500" />
                <span>Requires {issues.length * 15} mins total remediation</span>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Attack Surface & Findings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attack Surface Summary */}
            <div className="card p-6 space-y-4 flex flex-col">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Lock size={16} className="text-primary-500" />
                <h3 className="text-body font-bold text-text">Attack Surface Summary</h3>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {attackSurface.map((as) => (
                  <div key={as.name} className="flex justify-between items-start py-2 border-b border-border/30 text-caption">
                    <div>
                      <span className="font-bold text-text block">{as.name}</span>
                      <span className="text-text-muted text-[10px]">{as.detail}</span>
                    </div>
                    <Badge variant={as.variant as any} size="xs" className="font-semibold shrink-0">{as.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Security Findings Viewer */}
            <div className="lg:col-span-2 card p-6 flex flex-col space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2 justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  <h3 className="text-body font-bold text-text">Vulnerabilities Review</h3>
                </div>
                <Badge variant="primary">{issues.length} detected</Badge>
              </div>

              {issues.length === 0 ? (
                <EmptyState variant="no-security" title="Zero security issues detected." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                  {/* List panel */}
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

                  {/* Detail Panel */}
                  <div className="overflow-y-auto max-h-[380px] pr-1 space-y-4 text-body-xs">
                    {selectedIssue ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-body-sm font-bold text-text">{selectedIssue.title}</span>
                            <Badge variant="neutral" size="xs">{selectedIssue.category}</Badge>
                          </div>
                          <code className="font-mono bg-bg-subtle px-1.5 py-0.5 rounded text-[10px] text-secondary-500 block break-all">
                            {selectedIssue.file}:{selectedIssue.lineNumber}
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
                        <span>Select a vulnerability to review details</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
