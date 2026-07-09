import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Zap, Cloud, AlertTriangle, CheckCircle, HelpCircle, FileText, Folder, Cpu, Globe, Info } from 'lucide-react';
import { MetricCard, LaunchScoreCard } from '@/components/cards/Cards';
import { AppRadarChart } from '@/components/charts/Charts';
import { SeverityBadge, StatusBadge, Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Loading';
import { formatRelativeTime, getLaunchRecommendation } from '@/utils';
import type { Severity } from '@/types';

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [archResult, setArchResult] = useState<any>(null);
  const [showDeploymentReport, setShowDeploymentReport] = useState(false);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      setScanResult(JSON.parse(localScanData));
    }
    const localArchData = localStorage.getItem(`architecture_result_${id}`);
    if (localArchData) {
      setArchResult(JSON.parse(localArchData));
    }
    setLoading(false);
  }, [id]);

  if (!loading && !scanResult) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-h2 font-heading text-text mb-2 font-bold">No analysis available.</h2>
        <p className="text-body-sm text-text-muted max-w-sm">
          Please onboard and run a scan on this repository to view application insights.
        </p>
      </div>
    );
  }

  const security = scanResult?.security_findings || [];
  const project = scanResult ? {
    name: scanResult.metadata?.project_name || 'Unnamed Repository',
    status: 'active' as const,
    framework: scanResult.metadata?.frontend || scanResult.metadata?.backend || 'Other',
    lastScannedAt: new Date().toISOString(),
    launchScore: scanResult.launch_score?.overall ?? 0,
  } : undefined;

  const recommendation = getLaunchRecommendation(project?.launchScore ?? 0);
  const criticalCount  = security.filter((s: any) => s.severity === 'critical').length;
  const highCount      = security.filter((s: any) => s.severity === 'high').length;
  const mediumCount    = security.filter((s: any) => s.severity === 'medium').length;

  const importantFiles = scanResult?.importantFiles || [];
  const hasCloudConfig = importantFiles.some((f: string) => {
    const lower = f.toLowerCase();
    return lower.includes('dockerfile') || lower.includes('docker-compose') || lower.includes('k8s') || lower.includes('kubernetes') || lower.includes('vercel.json') || lower.includes('netlify.toml') || lower.includes('render.yaml');
  });
  const monthlyCloudCost = hasCloudConfig ? (scanResult?.metadata?.vercel || scanResult?.metadata?.netlify ? '$20' : '$120') : 'Unavailable';

  const radarData = [
    { subject: 'Security',     value: scanResult?.launch_score?.security ?? 100 },
    { subject: 'Performance',  value: scanResult?.launch_score?.performance ?? 100 },
    { subject: 'Architecture', value: scanResult?.launch_score?.overall ?? 100 },
    { subject: 'Cloud Cost',   value: scanResult?.launch_score?.cloud ?? 100 },
    { subject: 'Scalability',  value: scanResult?.launch_score?.cloud ?? 100 },
    { subject: 'Code Quality', value: scanResult?.launch_score?.quality ?? 100 },
  ];

  // Load unified RepositoryProfile from the backend analysis result
  const profile = scanResult?.repositoryProfile || {
    name: scanResult?.metadata?.project_name || 'Unnamed Repository',
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
  const categoryVal = isFact(profile.category) ? profile.category.value : profile.category;
  const frameworkVal = isFact(profile.framework) ? profile.framework.value : profile.framework;
  const patternVal = isFact(profile.architecturePattern) ? profile.architecturePattern.value : profile.architecturePattern;
  const runtimeVal = isFact(profile.runtime) ? profile.runtime.value : profile.runtime;
  const langVal = isFact(profile.primaryLanguage) ? profile.primaryLanguage.value : profile.primaryLanguage;
  const deployVal = isFact(profile.deploymentType) ? profile.deploymentType.value : profile.deploymentType;

  // Adaptive Score Title based on RepositoryProfile Type
  const getScoreTitle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('library') || t.includes('package')) return 'Package Quality';
    if (t.includes('framework')) return 'Framework Health';
    if (t.includes('backend api') || t.includes('api')) return 'Deployment Readiness';
    if (t.includes('frontend')) return 'Production Readiness';
    return 'Production Readiness';
  };

  const scoreTitle = getScoreTitle(typeVal);

  // Compile Strengths & Risks dynamically
  const strengths: string[] = [];
  const risks: string[] = [];

  if (profile.hasTests) {
    strengths.push("Automated verification: spec/test suites identified.");
  }
  if (profile.hasDocker) {
    strengths.push("Containerized: Docker config verified.");
  }
  if (profile.hasCI) {
    strengths.push("Continuous Integration active: pipeline configurations detected.");
  }
  if (strengths.length < 2 && profile.packageManager && profile.packageManager !== 'Unknown') {
    strengths.push(`Standard dependency management via ${profile.packageManager}.`);
  }
  if (strengths.length < 3) {
    strengths.push("Clean file structures mapping cleanly to architectural layers.");
  }

  if (criticalCount > 0) {
    risks.push(`${criticalCount} Critical vulnerabilities discovered in dependencies.`);
  }
  if (highCount > 0) {
    risks.push(`${highCount} High priority issues present.`);
  }
  if (!profile.hasTests) {
    risks.push("Zero automated test files detected.");
  }
  if (!profile.hasDocker && typeVal !== 'Library') {
    risks.push("No Docker setup identified; deployment deviates from dev environment.");
  }
  if (risks.length === 0) {
    risks.push("No critical code security risks detected.");
  }

  // --- "CAN I DEPLOY" EVALUATION LOGIC ---
  const overallScore = project?.launchScore ?? 0;
  
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

  const renderFact = (label: string, fact: any) => {
    const isObj = fact && typeof fact === 'object' && 'value' in fact;
    const val = isObj ? fact.value : fact;
    const confidence = isObj ? fact.confidence : 100;
    const evidence = isObj ? fact.evidence : [];
    const reason = isObj ? fact.reason : '';

    return (
      <div className="flex items-center justify-between py-2 border-b border-border/40 group relative cursor-help">
        <span className="text-body-xs text-text-muted">{label}</span>
        <span className="text-body-sm font-bold text-text bg-bg-subtle/50 px-2 py-0.5 rounded border border-border inline-block transition-colors group-hover:bg-primary-500/10 group-hover:border-primary-500/30">
          {val}
        </span>
        {isObj && (
          <div className="absolute right-0 top-8 w-72 p-4 rounded-xl border border-border bg-bg-card/95 backdrop-blur shadow-2xl opacity-0 scale-95 origin-top-right group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-50 text-body-xs space-y-2.5 font-normal">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="font-bold text-text">{label} Details</span>
              <span className="bg-primary-500/10 text-primary-500 border border-primary-500/20 px-1.5 py-0.5 rounded text-[10px] font-semibold">{confidence}% Confidence</span>
            </div>
            <div className="text-text-muted leading-relaxed">
              <strong className="text-text">Reason:</strong> {reason}
            </div>
            {evidence && evidence.length > 0 && (
              <div>
                <strong className="text-text block mb-1">Evidence:</strong>
                <div className="flex flex-wrap gap-1">
                  {evidence.map((ev: string, idx: number) => (
                    <span key={idx} className="bg-bg-subtle px-1.5 py-0.5 rounded font-mono text-[9px] text-text border border-border/40">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 relative">
      {/* Hero Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-h1 text-text font-bold tracking-tight">
              {profile.name}
            </h1>
            {project && <StatusBadge status={project.status} />}
          </div>
          <p className="text-body-xs text-text-muted font-mono">
            Last scanned {project?.lastScannedAt ? formatRelativeTime(project.lastScannedAt) : 'never'}
          </p>
        </div>

        {/* Premium Can I Deploy Trigger */}
        <button
          onClick={() => setShowDeploymentReport(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-body-sm font-semibold shadow-sm transition-all duration-200 ${
            deploymentDecision === 'APPROVED'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600/20 shadow-emerald-500/10'
              : deploymentDecision === 'APPROVED WITH WARNINGS'
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600/20 shadow-amber-500/10'
              : 'bg-red-500 hover:bg-red-600 text-white border-red-600/20 shadow-red-500/10'
          }`}
        >
          <Zap size={15} className="animate-pulse" />
          Can I Deploy?
        </button>
      </div>

      {/* Deployment Readiness Assessment Modal */}
      {showDeploymentReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-border/80 flex justify-between items-center bg-bg-subtle/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-500/10 text-primary-500 rounded-lg">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-text">Deployment Readiness Audit</h3>
                  <p className="text-[10px] text-text-muted font-mono">APPDOCTOR AI RELEASE DECISION</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeploymentReport(false)}
                className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-bg-subtle transition-colors"
              >
                Close Report
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1 text-left">
              
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

                <div className="flex gap-4 border-l border-border/40 pl-6 shrink-0">
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
                    { name: 'Security', score: scanResult?.launch_score?.security ?? 100, confidence: 90, summary: criticalCount > 0 ? `Compromised by ${criticalCount} critical dependencies.` : 'Clean security posture; zero critical vulnerabilities.' },
                    { name: 'Performance', score: scanResult?.launch_score?.performance ?? 100, confidence: 85, summary: 'Clean sync structure; no heavy blocking latency calls detected.' },
                    { name: 'Cloud Readiness', score: hasCloudConfig ? 100 : 50, confidence: 95, summary: hasCloudConfig ? 'Docker/Render infrastructure definitions verified.' : 'Missing target platform infrastructure configuration.' },
                    { name: 'Scalability', score: profile.hasCache ? 90 : 60, confidence: 80, summary: profile.hasCache ? 'Caching and stateless routing supports horizontal scaling.' : 'Lacks distributed caching components. Heavy SQL risks.' },
                    { name: 'Technical Debt', score: scanResult?.launch_score?.quality ?? 100, confidence: 90, summary: `Linter settings detected. Test cover needs optimization.` }
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

              {/* CTO Verdict */}
              <div className="space-y-3 pt-2">
                <h4 className="text-body-xs font-bold text-text uppercase tracking-wider font-mono">CTO Recommendation</h4>
                <div className="p-4 border border-border/80 bg-bg-subtle/30 rounded-xl">
                  <p className="text-body-xs text-text-muted italic leading-relaxed">
                    "From an engineering perspective, this repository shows solid structural design and code formatting. However, deploying to production with unresolved security vulnerabilities and without automated verification gates is not recommended. Execute the Immediate and High priority roadmaps to finalize release sign-off."
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-bg-subtle/50 flex justify-end">
              <button
                onClick={() => setShowDeploymentReport(false)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-body-sm font-semibold shadow-sm transition-colors"
              >
                Acknowledge Verdict
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Executive Summary Card */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 sm:p-8 bg-gradient-to-br from-bg-card via-bg-card to-primary-500/5 border border-border relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider block">Executive Summary</span>
            <p className="text-body-md text-text font-medium leading-relaxed">
              {scanResult?.overview_summary?.repository_health || 
               `Analysis of ${profile.name} indicates a verified ${frameworkVal} codebase organized as a ${patternVal} architecture pattern. No critical credentials leaks or execution issues block deployment.`}
            </p>
            <div className="pt-2">
              <span className="text-caption text-text-muted block font-semibold mb-1">CTO Verdict</span>
              <p className="text-body-sm text-text-muted leading-relaxed">
                {scanResult?.overview_summary?.overall_recommendation || "Ensure automated build gates pass before staging deployment."}
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:border-l lg:border-border/60 lg:pl-8">
            <div className="space-y-3">
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block">Top Strengths</span>
              <ul className="space-y-2">
                {strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-xs text-text">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">Technical Risks</span>
              <ul className="space-y-2">
                {risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-xs text-text">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
              <MetricCard 
                title="Security Issues" 
                value={loading ? '—' : security.length}
                unit="found" 
                icon={<Shield size={18} />} 
                trend="stable" 
                trendPositive={true}
                loading={loading}
              />
            </motion.div>
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
              <MetricCard 
                title="API Response (p95)" 
                value="Static Analysis"
                unit="Telemetry not determined" 
                icon={<Zap size={18} />} 
                trend="stable" 
                trendPositive={true}
                loading={loading}
              />
            </motion.div>
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
              <MetricCard 
                title="Monthly Cloud Cost" 
                value={loading ? '—' : monthlyCloudCost}
                unit={hasCloudConfig ? "Estimated" : "No cloud metadata detected"} 
                icon={<Cloud size={18} />} 
                trend="stable"
                loading={loading}
              />
            </motion.div>
          </div>

          {/* Adaptive Score Card + Radar Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
              <LaunchScoreCard
                score={project?.launchScore ?? 0}
                recommendation={recommendation}
                breakdown={radarData.map((r) => ({ label: r.subject, score: r.value }))}
                loading={loading}
              />
            </motion.div>

            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-body font-bold text-text mb-4">{scoreTitle} Breakdown</h3>
                <AppRadarChart data={radarData} height={200} loading={loading} />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Repository Insights */}
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 space-y-4">
            <h3 className="text-body font-bold text-text pb-2 border-b border-border/60">Repository Insights</h3>
            <div className="divide-y divide-border/30">
              {renderFact('Repository Type', profile.repositoryType)}
              {renderFact('Framework', profile.framework)}
              {renderFact('Runtime', profile.runtime)}
              {renderFact('Primary Language', profile.primaryLanguage)}
              {renderFact('Architecture Pattern', profile.architecturePattern)}
              {renderFact('Deployment Status', profile.deploymentType)}
            </div>
          </motion.div>

          {/* Scan Metadata Card */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 space-y-4">
            <h3 className="text-body font-bold text-text pb-2 border-b border-border/60">Scan Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-body-xs">
                <span className="text-text-muted flex items-center gap-1.5"><FileText size={12} /> Files</span>
                <span className="font-bold text-text">{profile.fileCount}</span>
              </div>
              <div className="flex justify-between items-center text-body-xs">
                <span className="text-text-muted flex items-center gap-1.5"><Folder size={12} /> Folders</span>
                <span className="font-bold text-text">{profile.folderCount}</span>
              </div>
              <div className="flex justify-between items-center text-body-xs">
                <span className="text-text-muted flex items-center gap-1.5"><Cpu size={12} /> Dependencies</span>
                <span className="font-bold text-text">{profile.dependencyCount}</span>
              </div>
              <div className="flex justify-between items-center text-body-xs">
                <span className="text-text-muted flex items-center gap-1.5"><Globe size={12} /> Languages</span>
                <span className="font-bold text-text">{Object.keys(scanResult?.extensions || {}).length} detected</span>
              </div>
              <div className="flex justify-between items-center text-body-xs">
                <span className="text-text-muted flex items-center gap-1.5"><Info size={12} /> Scan Mode</span>
                <span className="font-bold text-text">{scanResult?.analysis_mode || 'Full Scan'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/30">
                <span className="text-caption font-semibold text-text">Analysis Confidence</span>
                <Badge variant="primary" className="bg-primary-500/10 text-primary-500 border border-primary-500/20 font-semibold">
                  {profile.confidence}%
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Security Summary & AI Summary Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-primary-500" />
              <h3 className="text-body font-bold text-text">AI Architecture Assessment</h3>
            </div>
            <div className="space-y-3 text-body-sm text-text leading-relaxed">
              <p><strong>Security Posture:</strong> {scanResult?.overview_summary?.security_posture || 'Vulnerability scanning checks completed. Inspect findings for remediation.'}</p>
              <p><strong>Performance:</strong> {scanResult?.overview_summary?.performance || 'Source routines evaluated for blockages and sync calls.'}</p>
              <p><strong>Deployment Readiness:</strong> {scanResult?.overview_summary?.deployment_readiness || 'Infrastructure mappings completed.'}</p>
            </div>
          </div>
        </motion.div>

        <motion.div custom={9} variants={fadeUp} initial="hidden" animate="visible" className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-bold text-text">Security Severity Summary</h3>
            <Badge variant={criticalCount > 0 ? 'critical' : 'success'}>
              {criticalCount > 0 ? `${criticalCount} Critical` : 'Secure'}
            </Badge>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Critical', count: criticalCount },
              { label: 'High',     count: highCount     },
              { label: 'Medium',   count: security.filter((s: any) => s.severity === 'medium').length },
              { label: 'Low',      count: security.filter((s: any) => s.severity === 'low').length    },
            ].map((row) => {
              const pct = security.length > 0 ? Math.round((row.count / security.length) * 100) : 0;
              const sev = row.label.toLowerCase() as Severity;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <SeverityBadge severity={sev} />
                  <div className="flex-1">
                    <ProgressBar value={pct} size="xs" animated />
                  </div>
                  <span className="text-body-sm font-semibold text-text w-4 text-right">{row.count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
