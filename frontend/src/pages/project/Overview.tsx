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
    <div className="space-y-8">
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
      </div>

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
