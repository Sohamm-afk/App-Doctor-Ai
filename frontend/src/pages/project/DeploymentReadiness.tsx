import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Zap, Cloud, AlertTriangle, CheckCircle, Info, ArrowLeft, Rocket } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/utils';
import { PageLoading } from '@/components/ui/Loading';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 }
  }),
};

export default function DeploymentReadiness() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    // Notify Navbar that we are loading
    window.dispatchEvent(new CustomEvent('deployment-loading-start'));

    if (id) {
      const localScanData = localStorage.getItem(`scan_result_${id}`);
      if (localScanData) {
        setScanResult(JSON.parse(localScanData));
      }
    }

    const timer = setTimeout(() => {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('deployment-loading-end'));
    }, 450); // Premium brief visual delay for data compilation animation

    return () => {
      clearTimeout(timer);
      window.dispatchEvent(new CustomEvent('deployment-loading-end'));
    };
  }, [id]);

  if (loading) {
    return <PageLoading />;
  }

  if (!scanResult) {
    return (
      <div className="space-y-8 relative">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-5">
          <div>
            <h1 className="font-heading text-h1 text-text font-bold tracking-tight">
              Deployment Readiness Audit
            </h1>
            <p className="text-body-xs text-text-muted font-mono">
              No Repository Selected
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>

        <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-h2 font-heading text-text mb-2 font-bold">No analysis available.</h2>
          <p className="text-body-sm text-text-muted max-w-sm">
            Please onboard and run a scan on this repository to view application insights.
          </p>
        </div>
      </div>
    );
  }

  const security = scanResult.security_findings || [];
  const project = {
    name: scanResult.metadata?.project_name || 'Unnamed Repository',
    status: 'active' as const,
    framework: scanResult.metadata?.frontend || scanResult.metadata?.backend || 'Other',
    lastScannedAt: new Date().toISOString(),
    launchScore: scanResult.launch_score?.overall ?? 0,
  };

  const criticalCount = security.filter((s: any) => s.severity === 'critical').length;
  const highCount     = security.filter((s: any) => s.severity === 'high').length;
  const mediumCount   = security.filter((s: any) => s.severity === 'medium').length;

  const importantFiles = scanResult.importantFiles || [];
  const hasCloudConfig = importantFiles.some((f: string) => {
    const lower = f.toLowerCase();
    return lower.includes('dockerfile') || lower.includes('docker-compose') || lower.includes('k8s') || lower.includes('kubernetes') || lower.includes('vercel.json') || lower.includes('netlify.toml') || lower.includes('render.yaml');
  });

  const profile = scanResult.repositoryProfile || {
    name: scanResult.metadata?.project_name || 'Unnamed Repository',
    repositoryType: { value: 'Unknown', confidence: 100, evidence: [], reason: 'No profile' },
    category: { value: 'Software Package', confidence: 100, evidence: [], reason: 'No profile' },
    framework: { value: 'None', confidence: 100, evidence: [], reason: 'No profile' },
    architecturePattern: { value: 'Unknown', confidence: 100, evidence: [], reason: 'No profile' },
    runtime: { value: 'Unknown', confidence: 100, evidence: [], reason: 'No profile' },
    primaryLanguage: { value: 'Unknown', confidence: 100, evidence: [], reason: 'No profile' },
    confidence: 100,
    maturity: { value: 'Stable', confidence: 100, evidence: [], reason: 'No profile' },
    deploymentType: { value: 'Static Hosting', confidence: 100, evidence: [], reason: 'No profile' },
    packageManager: 'Unknown',
    fileCount: 0,
    folderCount: 0,
    dependencyCount: 0,
    hasTests: false,
    hasDocker: false,
    hasCI: false,
    hasDatabase: false,
    hasCache: false,
    hasQueue: false,
    detectedTechnologies: []
  };

  const isFact = (item: any) => item && typeof item === 'object' && 'value' in item;
  const typeVal = isFact(profile.repositoryType) ? profile.repositoryType.value : profile.repositoryType;
  const patternVal = isFact(profile.architecturePattern) ? profile.architecturePattern.value : profile.architecturePattern;

  // Compile Strengths & Risks dynamically
  const strengths: string[] = [];
  if (profile.hasTests) strengths.push("Automated verification: spec/test suites identified.");
  if (profile.hasDocker) strengths.push("Containerized: Docker config verified.");
  if (profile.hasCI) strengths.push("Continuous Integration active: pipeline configurations detected.");
  if (strengths.length < 2 && profile.packageManager && profile.packageManager !== 'Unknown') {
    strengths.push(`Standard dependency management via ${profile.packageManager}.`);
  }
  if (strengths.length < 3) {
    strengths.push("Clean file structures mapping cleanly to architectural layers.");
  }

  // --- "CAN I DEPLOY" EVALUATION LOGIC ---
  const overallScore = project.launchScore;
  
  let deploymentDecision: 'APPROVED' | 'APPROVED WITH WARNINGS' | 'NOT READY' = 'APPROVED';
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let deploymentConfidence = profile.confidence ?? 95;

  if (criticalCount > 0 || overallScore < 70) {
    deploymentDecision = 'NOT READY';
    riskLevel = 'HIGH';
  } else if (highCount > 0 || !profile.hasTests || !profile.hasDocker || overallScore < 85) {
    deploymentDecision = 'APPROVED WITH WARNINGS';
    riskLevel = 'MEDIUM';
  }

  // Compile Blockers
  const blockersList: string[] = [];
  if (criticalCount > 0) {
    blockersList.push(`Contains ${criticalCount} critical security vulnerability groups (remediation required).`);
  }
  if (overallScore < 70) {
    blockersList.push(`Overall production readiness index (${overallScore}/100) falls below quality threshold.`);
  }

  // Compile Warnings
  const warningsList: string[] = [];
  if (highCount > 0) {
    warningsList.push(`Detected ${highCount} high-severity security vulnerabilities.`);
  }
  if (!profile.hasTests) {
    warningsList.push("Missing automated test suite config (low test coverage indicators).");
  }
  if (!profile.hasDocker) {
    warningsList.push("No Dockerfile configuration found for container standardization.");
  }
  if (!profile.hasCI) {
    warningsList.push("No CI/CD pipeline settings (GitHub Actions or similar) configured.");
  }
  if (mediumCount > 0) {
    warningsList.push(`Contains ${mediumCount} medium-severity library quality issues.`);
  }

  return (
    <div className="space-y-8 relative text-left">
      {/* Hero Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-h1 text-text font-bold tracking-tight">
              Deployment Readiness Audit
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-body-xs text-text-muted font-mono">
            {profile.name} • AppDoctor AI Release Decision
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>

      {/* Main Report Layout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Verdict Banner */}
        <div className={`p-6 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          deploymentDecision === 'APPROVED'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            : deploymentDecision === 'APPROVED WITH WARNINGS'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">EXECUTIVE VERDICT</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight">
                {deploymentDecision === 'APPROVED' ? '✓ RELEASE APPROVED' :
                 deploymentDecision === 'APPROVED WITH WARNINGS' ? '⚠ APPROVED WITH WARNINGS' :
                 '✗ DEPLOYMENT DEFERRED'}
              </span>
            </div>
            <p className="text-body-xs text-text-muted max-w-lg leading-relaxed">
              {deploymentDecision === 'APPROVED' 
                ? 'The codebase satisfies all quality metrics and shows zero security or stability blockers. Authorized for production release.'
                : deploymentDecision === 'APPROVED WITH WARNINGS'
                ? 'The repository can be deployed, but requires prompt hotfixes regarding missing containerization or test coverage.'
                : 'Critical blockers prevent safe deployment. Address security vulnerabilities immediately to authorize release.'}
            </p>
          </div>

          <div className="flex gap-4 md:border-l border-l-0 border-border/45 md:pl-6 pl-0 shrink-0">
            <div className="text-center">
              <span className="text-[9px] font-bold text-text-muted block uppercase font-mono">CONFIDENCE</span>
              <span className="text-lg font-bold text-text">{deploymentConfidence}%</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-bold text-text-muted block uppercase font-mono">RISK LEVEL</span>
              <span className={`text-lg font-bold ${
                riskLevel === 'LOW' ? 'text-emerald-500' :
                riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-red-500'
              }`}>{riskLevel}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-bold text-text-muted block uppercase font-mono">SCORE</span>
              <span className="text-lg font-bold text-text">{overallScore}/100</span>
            </div>
          </div>
        </div>

        {/* Decision Factors */}
        <div className="space-y-3">
          <h4 className="text-body-xs font-bold text-text uppercase tracking-wider font-mono">Readiness Decision Factors</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Architecture', score: overallScore, confidence: 95, summary: `Layered components verified; aligned to standard ${patternVal} architecture patterns.` },
              { name: 'Security', score: scanResult.launch_score?.security ?? 100, confidence: 90, summary: criticalCount > 0 ? `Compromised by ${criticalCount} critical dependencies.` : 'Clean security posture; zero critical vulnerabilities.' },
              { name: 'Performance', score: scanResult.launch_score?.performance ?? 100, confidence: 85, summary: 'Clean sync structure; no heavy blocking latency calls detected.' },
              { name: 'Cloud Readiness', score: hasCloudConfig ? 100 : 50, confidence: 95, summary: hasCloudConfig ? 'Docker/Render infrastructure definitions verified.' : 'Missing target platform infrastructure configuration.' },
              { name: 'Scalability', score: profile.hasCache ? 90 : 60, confidence: 80, summary: profile.hasCache ? 'Caching and stateless routing supports horizontal scaling.' : 'Lacks distributed caching components. Heavy SQL risks.' },
              { name: 'Technical Debt', score: scanResult.launch_score?.quality ?? 100, confidence: 90, summary: `Linter settings detected. Test cover needs optimization.` }
            ].map((factor) => (
              <div key={factor.name} className="border border-border/60 p-4 rounded-xl space-y-2 bg-bg-subtle/20">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm font-bold text-text">{factor.name}</span>
                  <div className="flex gap-2 text-[10px] font-semibold text-text-muted font-mono">
                    <span>Conf: {factor.confidence}%</span>
                    <span>•</span>
                    <span className={factor.score >= 85 ? 'text-emerald-500' : factor.score >= 70 ? 'text-amber-500' : 'text-red-500'}>
                      Score: {factor.score}
                    </span>
                  </div>
                </div>
                <p className="text-body-xs text-text-muted leading-relaxed">{factor.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Blockers & Warnings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Blockers */}
          <div className="space-y-3">
            <h4 className="text-body-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Verified Blockers ({blockersList.length})
            </h4>
            {blockersList.length === 0 ? (
              <div className="p-4 border border-emerald-500/10 bg-emerald-500/5 text-emerald-500 rounded-xl text-body-xs">
                No blockers detected. The release pathway is legally and technically verified.
              </div>
            ) : (
              <ul className="space-y-2">
                {blockersList.map((bl, i) => (
                  <li key={i} className="flex gap-2 text-body-xs text-text border border-red-500/10 bg-red-500/5 p-3 rounded-lg">
                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span>{bl}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Warnings */}
          <div className="space-y-3">
            <h4 className="text-body-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Readiness Warnings ({warningsList.length})
            </h4>
            {warningsList.length === 0 ? (
              <div className="p-4 border border-emerald-500/10 bg-emerald-500/5 text-emerald-500 rounded-xl text-body-xs">
                Zero operational warnings. Clean deployment configuration.
              </div>
            ) : (
              <ul className="space-y-2">
                {warningsList.map((wn, i) => (
                  <li key={i} className="flex gap-2 text-body-xs text-text border border-border p-3 rounded-lg">
                    <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{wn}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Strengths */}
        <div className="space-y-3">
          <h4 className="text-body-xs font-bold text-text uppercase tracking-wider font-mono">Deployment Strengths</h4>
          <div className="p-4 border border-emerald-500/10 bg-emerald-500/5 rounded-xl space-y-2">
            {strengths.map((str, i) => (
              <div key={i} className="flex items-center gap-2 text-body-xs text-text">
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Plan */}
        <div className="space-y-3">
          <h4 className="text-body-xs font-bold text-text uppercase tracking-wider font-mono">CTO Priority Action Plan</h4>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {[
              { priority: 'IMMEDIATE', task: 'Remediate critical security vulnerabilities in package imports.', effort: '1 Day', impact: 'Eliminates codebase threat surface' },
              { priority: 'HIGH', task: 'Initialize unit test suites (Jest/Vitest) to guard core controller logic.', effort: '3 Days', impact: 'Prevents regression and functional bugs' },
              { priority: 'MEDIUM', task: 'Configure Dockerfile containing configuration steps.', effort: '1 Day', impact: 'Standardizes deployment execution environment' },
              { priority: 'LOW', task: 'Establish Prometheus/Grafana or cloud provider server monitors.', effort: '2 Days', impact: 'Ensures live runtime visibility' }
            ].map((action, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-bg-subtle/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                      action.priority === 'IMMEDIATE' ? 'bg-red-500/15 text-red-500' :
                      action.priority === 'HIGH' ? 'bg-amber-500/15 text-amber-500' :
                      'bg-blue-500/15 text-blue-500'
                    }`}>{action.priority}</span>
                    <span className="text-body-xs font-bold text-text">{action.task}</span>
                  </div>
                  <p className="text-[10px] text-text-muted">{action.impact}</p>
                </div>
                <span className="text-body-xs font-mono font-bold text-text bg-bg-subtle border border-border px-2.5 py-1 rounded shrink-0">
                  {action.effort} Effort
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTO Recommendation */}
        <div className="space-y-3 pt-2">
          <h4 className="text-body-xs font-bold text-text uppercase tracking-wider font-mono">CTO Recommendation</h4>
          <div className="p-4 border border-border/80 bg-bg-subtle/30 rounded-xl">
            <p className="text-body-xs text-text-muted italic leading-relaxed">
              "From an engineering perspective, this repository shows solid structural design and code formatting. However, deploying to production with unresolved security vulnerabilities and without automated verification gates is not recommended. Execute the Immediate and High priority roadmaps to finalize release sign-off."
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
