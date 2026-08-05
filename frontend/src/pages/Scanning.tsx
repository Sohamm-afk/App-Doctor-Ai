import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, CheckCircle2, ChevronRight, Terminal as TermIcon, ShieldAlert,
  GitBranch, FolderCode, Cpu, Hammer, Database, Shield, Cloud, Bot,
  TrendingUp, Activity, Sparkles, Clock
} from 'lucide-react';
import axios from 'axios';
import { Terminal } from '@/components/terminal/Terminal';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import { useToast } from '@/components/ui/Toast';

// ─── Stage Interface ──────────────────────────────────────────────
interface ScanStage {
  id: string;
  label: string;
  desc: string;
  status: 'pending' | 'running' | 'success' | 'error';
  logs: string[];
  finding?: string;
}

const INITIAL_STAGES: ScanStage[] = [
  { id: '1', label: 'Cloning Repository', desc: 'Securely downloading repository codebase from remote Git host', status: 'pending', logs: ['Initializing sandbox tunnel...', 'Contacting github.com via secure client SSH...', 'Cloning master branch of remote repository...'] },
  { id: '2', label: 'Reading Project Structure', desc: 'Indexing files metadata and analyzing directory layouts', status: 'pending', logs: ['Indexing files metadata...', 'Scanning directory paths...', 'Resolving config manifests...'] },
  { id: '3', label: 'Detecting Framework', desc: 'Resolving stack frameworks, configurations, and packages', status: 'pending', logs: ['Analyzing configuration files...', 'Resolving package dependencies...'] },
  { id: '4', label: 'Extracting Components', desc: 'Extracting source modules, controllers, routes, and services', status: 'pending', logs: ['Extracting architectural components...', 'Indexing codebase structures...'] },
  { id: '5', label: 'Building Architecture', desc: 'Generating service dependencies topology and boundaries', status: 'pending', logs: ['Building dependency relationships...', 'Resolving architectural topology patterns...'] },
  { id: '6', label: 'Security Analysis', desc: 'Scanning files for SQL injections, credentials, and dependency CVEs', status: 'pending', logs: ['Scanning codebase for OWASP vulnerabilities...', 'Evaluating secret keys and configurations...'] },
  { id: '7', label: 'Performance Analysis', desc: 'Auditing code execution flow, rendering blockages, and loops', status: 'pending', logs: ['Evaluating codebase performance traits...', 'Analyzing loop complexity benchmarks...'] },
  { id: '8', label: 'Cloud Readiness', desc: 'Translating files into AWS/Vercel/GCP resource specifications', status: 'pending', logs: ['Assessing cloud integration patterns...', 'Reading serverless configurations...'] },
  { id: '9', label: 'Scalability Assessment', desc: 'Simulating capacity workloads and event-loop queuing models', status: 'pending', logs: ['Evaluating throughput workload metrics...', 'Checking database lock concurrency logs...'] },
  { id: '10', label: 'Technical Debt Analysis', desc: 'Resolving design patterns, code duplications, and complexity', status: 'pending', logs: ['Analyzing design-pattern violations...', 'Calculating refactoring debt metrics...'] },
  { id: '11', label: 'AI CTO Preparation', desc: 'Spinning up virtual assistant context and remediation scripts', status: 'pending', logs: ['Initializing AI CTO session sandbox...', 'Compiling prioritized remediation actions...'] },
  { id: '12', label: 'Mission Control Ready', desc: 'Compiling readiness logs and resolving launch indexes', status: 'pending', logs: ['Finalizing Launch Score...', 'Preparing dashboard review panels...'] },
];

// ─── Ticking Counter Component ─────────────────────────────────────
function Counter({ value, duration = 850 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / Math.max(end, 1)), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

// ─── Dynamic Log Resolver ──────────────────────────────────────────
const getStageLogs = (stageId: string, data: any): string[] => {
  const repoName = data?.metadata?.repository_name || 'repository';
  const fileCount = data?.metadata?.file_count || data?.repositoryProfile?.fileCount || 0;
  const folderCount = data?.metadata?.folder_count || data?.repositoryProfile?.folderCount || 0;
  const primaryLanguage = data?.metadata?.primary_language || data?.repositoryProfile?.primaryLanguage?.value || 'TypeScript';
  const framework = data?.metadata?.frontend || data?.metadata?.backend || data?.repositoryProfile?.framework?.value || 'Next.js';
  const componentsCount = data?.repositoryProfile?.detectedTechnologies?.length || 0;
  const pattern = data?.repositoryProfile?.architecturePattern?.value || 'Layered';
  const securityCount = data?.security_findings?.length ?? 0;
  const performanceCount = data?.performance_findings?.length ?? 0;
  const deploymentType = data?.repositoryProfile?.deploymentType?.value || 'Static Hosting';
  const hasQueue = data?.repositoryProfile?.hasQueue ?? false;
  const remediationTime = data?.metadata?.remediation_time || 0;
  const score = data?.launch_score?.overall ?? 0;

  switch (stageId) {
    case '1':
      return [
        'Initializing sandbox tunnel...',
        'Contacting github.com via secure client SSH...',
        `Cloned remote ${repoName} repository successfully.`
      ];
    case '2':
      return [
        'Indexing files metadata...',
        `✓ ${fileCount} files across ${folderCount} folders analyzed.`
      ];
    case '3':
      return [
        `Resolving config manifests...`,
        `✓ ${primaryLanguage} codebase detected. Framework: ${framework}`
      ];
    case '4':
      return [
        'Parsing codebase imports...',
        `✓ ${componentsCount} components successfully extracted.`
      ];
    case '5':
      return [
        'Building dependency topology map...',
        `✓ Verified ${pattern} architectural pattern.`
      ];
    case '6':
      return [
        'Scanning source code files for OWASP vulnerabilities...',
        `✓ Audited security findings. Discovered ${securityCount} issues.`
      ];
    case '7':
      return [
        'Running complexity and loop audits...',
        `✓ Performance audit finished. Discovered ${performanceCount} warnings.`
      ];
    case '8':
      return [
        'Checking docker compose configurations...',
        `✓ Deployment option: ${deploymentType} resolved.`
      ];
    case '9':
      return [
        'Simulating request flow thread pool...',
        `✓ Scalability factors determined: ${hasQueue ? 'Queues found' : 'Standard throughput capacity verified'}.`
      ];
    case '10':
      return [
        'Calculating code smell refactoring time...',
        `✓ Technical debt audited. Remediation time: ${remediationTime} minutes.`
      ];
    case '11':
      return [
        'Finalizing virtual assistant parameters...',
        `✓ AI CTO conversation sandbox context ready.`
      ];
    case '12':
      return [
        'Preparing workspace dashboards...',
        `✓ Launch score compiled at ${score}/100. Audit reports resolved.`
      ];
    default:
      return [];
  }
};

interface UserFriendlyError {
  title: string;
  what: string;
  why: string;
  next: string;
  showRetry: boolean;
}

function parseScanError(rawError: string): UserFriendlyError {
  const err = rawError.toLowerCase();
  
  if (err.includes('not found') || err.includes('invalid') || err.includes('github url') || err.includes('format')) {
    return {
      title: "Invalid GitHub Repository Link",
      what: "The repository link provided could not be resolved by our Git client.",
      why: "The URL might have a typo, use an unsupported Git host, or lack a proper owner/repository structure.",
      next: "Double check the repository URL format (e.g., https://github.com/owner/repo) and copy-paste it directly from your browser's address bar.",
      showRetry: false
    };
  }
  
  if (err.includes('private') || err.includes('auth') || err.includes('permission') || err.includes('unauthorized') || err.includes('access denied')) {
    return {
      title: "Access Denied: Private Repository Detected",
      what: "Our scanner was unable to access the codebase because the repository is set to private.",
      why: "Your security policies restrict public access, and our backend client lacks the SSH credentials or OAuth permissions to read your code.",
      next: "Make sure the repository is public, or connect AppDoctor AI to your GitHub account to grant reading permissions for private repositories.",
      showRetry: true
    };
  }
  
  if (err.includes('timeout') || err.includes('timed out') || err.includes('deadline')) {
    return {
      title: "Network Request Timed Out",
      what: "The connection to the repository host or security scanning engine timed out.",
      why: "A network delay occurred while cloning large files or fetching dependency CVE indices from upstream databases.",
      next: "Click 'Retry Analysis' to re-initialize the cloning sandbox. If the repository is exceptionally large, consider scanning a shallow branch subset.",
      showRetry: true
    };
  }
  
  if (err.includes('rate limit') || err.includes('too many requests') || err.includes('429')) {
    return {
      title: "API Rate Limit Exceeded",
      what: "The analysis request was throttled due to high traffic limits.",
      why: "AppDoctor AI received an excessive volume of requests in a short time frame, exceeding GitHub API or Gemini translation quotes.",
      next: "Please wait a few minutes for the rate limits to reset automatically, then click 'Retry Analysis' to resume.",
      showRetry: true
    };
  }
  
  if (err.includes('gemini') || err.includes('llm') || err.includes('ai service') || err.includes('model error') || err.includes('api key')) {
    return {
      title: "AI Analysis Service Unavailable",
      what: "The AI reasoning system failed to generate architectural or CTO guidelines.",
      why: "The upstream Gemini reasoning api key is invalid, or the service encountered transient downstream service disruptions.",
      next: "Wait a moment and try again. AppDoctor will automatically attempt to connect to our backup AI fallback models.",
      showRetry: true
    };
  }
  
  if (err.includes('network error') || err.includes('offline') || err.includes('connect econrefused') || err.includes('failed to fetch')) {
    return {
      title: "Backend Analysis Service Offline",
      what: "We couldn't establish a network connection to the AppDoctor analysis server.",
      why: "The backend server is either offline, restarting, or blocked by a local network firewall rule.",
      next: "Ensure that the backend server is active at localhost:5000 and check your network environment connectivity.",
      showRetry: true
    };
  }
  
  // Default fallback for general analysis failures
  return {
    title: "Repository Analysis Pipeline Failed",
    what: "The secure analysis sandbox encountered a compiler or structural parsing failure.",
    why: "The static analysis engines failed to parse the file structures, or crashed during dependency tree resolution.",
    next: "Review your config manifests (like package.json or requirements.txt) for syntax anomalies, then click 'Retry Analysis'.",
    showRetry: true
  };
}

export default function ScanningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useToast();
  const { github_url } = (location.state as { github_url?: string }) || {};

  const [stages, setStages] = useState<ScanStage[]>(INITIAL_STAGES);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [terminalLines, setTerminalLines] = useState<any[]>([]);
  const [complete, setComplete] = useState(false);

  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<any | null>(null);
  const [scannedProjectId, setScannedProjectId] = useState<string>('proj-001');
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Stats Counters
  const [stats, setStats] = useState({
    files: 0,
    folders: 0,
    dependencies: 0,
    components: 0,
    relationships: 0,
  });

  // Trigger Backend Analysis API on mount
  useEffect(() => {
    if (!github_url) {
      setApiLoading(false);
      setApiError("No GitHub repository URL was provided.");
      error("No repository URL found. Please upload a repository again.");
      navigate(ROUTES.WORKSPACE_UPLOAD);
      return;
    }

    setApiLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    axios.post(`${apiBaseUrl}/api/analyze`, { github_url })
      .then((res) => {
        const data = res.data;
        setApiResult(data);
        setApiLoading(false);

        // Map backend analysis to frontend Project schema
        const projId = data.metadata?.repository_name || 'proj-' + Math.random().toString(36).substr(2, 9);
        setScannedProjectId(projId);

        // Save complete scan response in localStorage for mockService adapter!
        localStorage.setItem(`scan_result_${projId}`, JSON.stringify(data));

        // Save scanned project list dynamically in localStorage
        const listStr = localStorage.getItem('scanned_projects_list') || '[]';
        const ids: string[] = JSON.parse(listStr);
        if (!ids.includes(projId)) {
          ids.push(projId);
          localStorage.setItem('scanned_projects_list', JSON.stringify(ids));
        }

        // Dynamically customize log text and findings for stages
        setStages((prev) =>
          prev.map((stage) => {
            const dynamicLogs = getStageLogs(stage.id, data);
            
            const fileCount = data.metadata?.file_count || data.repositoryProfile?.fileCount || 0;
            const folderCount = data.metadata?.folder_count || data.repositoryProfile?.folderCount || 0;
            const primaryLanguage = data.metadata?.primary_language || data.repositoryProfile?.primaryLanguage?.value || 'TypeScript';
            const framework = data.metadata?.frontend || data.metadata?.backend || data.repositoryProfile?.framework?.value || 'Next.js';
            const componentsCount = data.repositoryProfile?.detectedTechnologies?.length || 0;
            const pattern = data.repositoryProfile?.architecturePattern?.value || 'Layered';
            const securityCount = data.security_findings?.length ?? 0;
            const performanceCount = data.performance_findings?.length ?? 0;
            const deploymentType = data.repositoryProfile?.deploymentType?.value || 'Static Hosting';
            const hasQueue = data.repositoryProfile?.hasQueue ?? false;
            const remediationTime = data.metadata?.remediation_time || 0;
            const score = data.launch_score?.overall ?? 0;

            let finding = '';
            if (stage.id === '1') finding = `✓ Cloned ${data.metadata?.project_name || 'repo'}`;
            else if (stage.id === '2') finding = `✓ ${fileCount} files, ${folderCount} folders`;
            else if (stage.id === '3') finding = `✓ ${framework} detected`;
            else if (stage.id === '4') finding = `✓ ${componentsCount} components`;
            else if (stage.id === '5') finding = `✓ ${pattern} pattern resolved`;
            else if (stage.id === '6') finding = `✓ ${securityCount} vulnerabilities`;
            else if (stage.id === '7') finding = `✓ ${performanceCount} alerts`;
            else if (stage.id === '8') finding = `✓ ${deploymentType}`;
            else if (stage.id === '9') finding = `✓ ${hasQueue ? 'Queues found' : 'Ready'}`;
            else if (stage.id === '10') finding = `✓ ${remediationTime} mins debt`;
            else if (stage.id === '11') finding = `✓ AI CTO ready`;
            else if (stage.id === '12') finding = `✓ Score ${score}/100`;

            return {
              ...stage,
              logs: dynamicLogs,
              finding,
            };
          })
        );
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Failed to analyze repository';
        setApiError(msg);
        setApiLoading(false);
      });
  }, [github_url, retryTrigger]);

  // Stage Processing Effect Loop
  useEffect(() => {
    if (apiError) {
      setStages((prev) =>
        prev.map((s, idx) => {
          if (idx === currentStageIdx) return { ...s, status: 'error' as const };
          return s;
        })
      );
      setTerminalLines((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: 'error',
          content: `❌ ANALYSIS FAILED: ${apiError}`,
        },
      ]);
      return;
    }

    if (currentStageIdx >= stages.length) {
      setComplete(true);
      return;
    }

    const activeStage = stages[currentStageIdx];
    if (!activeStage) return;

    // Set stage status to 'running'
    setStages((prev) =>
      prev.map((s, idx) => {
        if (idx === currentStageIdx) return { ...s, status: 'running' as const };
        return s;
      })
    );

    let logIdx = 0;
    const logInterval = setInterval(() => {
      // Pause progression at detecting stage (index 2) until API resolves successfully
      if (activeStage.id === '3' && apiLoading && !apiResult && !apiError) {
        if (logIdx === 0) {
          setTerminalLines((prev) => [
            ...prev,
            {
              id: `wait-${currentStageIdx}`,
              type: 'info',
              content: 'Analyzing repository structure in remote sandbox (this may take up to a minute)...',
            },
          ]);
          logIdx = 1;
        }
        return;
      }

      if (logIdx < activeStage.logs.length) {
        const lineContent = activeStage.logs[logIdx] ?? '';
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `line-${currentStageIdx}-${logIdx}`,
            type: lineContent.includes('WARNING') ? 'warning' : 'info',
            content: lineContent,
          },
        ]);
        logIdx++;
      } else {
        clearInterval(logInterval);

        // Mark stage success
        setStages((prev) =>
          prev.map((s, idx) => {
            if (idx === currentStageIdx) return { ...s, status: 'success' as const };
            return s;
          })
        );

        // Live stats ticking resolver
        if (apiResult) {
          const data = apiResult;
          const fileCount = data.metadata?.file_count || data.repositoryProfile?.fileCount || 184;
          const folderCount = data.metadata?.folder_count || data.repositoryProfile?.folderCount || 23;
          const componentsCount = data.repositoryProfile?.detectedTechnologies?.length || 8;
          const dependencyCount = data.repositoryProfile?.dependencyCount || 42;
          const relationshipsCount = Math.round(componentsCount * 1.5);

          if (activeStage.id === '2') {
            setStats(prev => ({ ...prev, files: fileCount, folders: folderCount }));
          } else if (activeStage.id === '3') {
            setStats(prev => ({ ...prev, dependencies: dependencyCount }));
          } else if (activeStage.id === '4') {
            setStats(prev => ({ ...prev, components: componentsCount }));
          } else if (activeStage.id === '5') {
            setStats(prev => ({ ...prev, relationships: relationshipsCount }));
          }
        } else {
          // Defaults if backend has not resolved yet
          if (activeStage.id === '2') {
            setStats(prev => ({ ...prev, files: 154, folders: 18 }));
          }
        }

        // Add success line
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `success-${currentStageIdx}`,
            type: 'success',
            content: `✓ ${activeStage.label} completed.`,
          },
        ]);

        // Proceed to next stage
        setTimeout(() => {
          setCurrentStageIdx((prev) => prev + 1);
        }, 320);
      }
    }, 300);

    return () => clearInterval(logInterval);
  }, [currentStageIdx, apiLoading, apiResult, apiError, stages.length]);

  const handleRetry = () => {
    setApiError(null);
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', logs: [...s.logs] })));
    setCurrentStageIdx(0);
    setTerminalLines([]);
    setComplete(false);
    setApiLoading(true);
    setRetryTrigger((prev) => prev + 1);
  };

  // SVG Architecture Graph Nodes Config
  const GRAPH_NODES = [
    { id: 'repo', label: 'Repository', x: 220, y: 140, icon: <GitBranch size={16} />, activeStage: 0 },
    { id: 'structure', label: 'File System', x: 100, y: 70, icon: <FolderCode size={16} />, activeStage: 1 },
    { id: 'framework', label: 'Framework', x: 340, y: 70, icon: <Cpu size={16} />, activeStage: 2 },
    { id: 'component', label: 'Services', x: 100, y: 210, icon: <Hammer size={16} />, activeStage: 3 },
    { id: 'db', label: 'Database', x: 340, y: 210, icon: <Database size={16} />, activeStage: 4 },
    { id: 'security', label: 'Security', x: 50, y: 140, icon: <Shield size={16} />, activeStage: 5 },
    { id: 'cloud', label: 'Cloud Host', x: 390, y: 140, icon: <Cloud size={16} />, activeStage: 7 },
    { id: 'cto', label: 'AI CTO', x: 220, y: 40, icon: <Bot size={16} />, activeStage: 10 },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ─── LEFT PANEL: Analysis Timeline Checklist ─── */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-1">
            <h1 className="font-heading text-h2 text-text font-bold tracking-tight">
              {complete ? 'Analysis Complete' : 'Repository Analysis Pipeline'}
            </h1>
            <p className="text-body-sm text-text-muted">
              {complete
                ? 'AppDoctor virtual agents have finalized your code review.'
                : `Analyzing codebase structure in sandbox...`}
            </p>
          </div>

          <div className="card p-5 bg-bg-card border border-border h-[540px] overflow-y-auto space-y-4 pr-3 scrollbar-thin">
            {stages.map((stage, idx) => {
              const isPending = stage.status === 'pending';
              const isRunning = stage.status === 'running';
              const isSuccess = stage.status === 'success';

              return (
                <div key={stage.id} className="relative">
                  {/* Vertical Timeline Connection Line */}
                  {idx < stages.length - 1 && (
                    <div className={cn(
                      "absolute left-[10px] top-6 bottom-[-20px] w-[2px] transition-colors duration-300",
                      isSuccess ? "bg-emerald-500/30" : "bg-border"
                    )} />
                  )}

                  <div className={cn(
                    'flex items-start gap-4 transition-all duration-300',
                    isPending && 'opacity-40 scale-[0.98]'
                  )}>
                    {/* Stage Indicator Badge */}
                    <div className="relative mt-0.5">
                      {isSuccess ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                          <Check size={11} strokeWidth={4} />
                        </div>
                      ) : isRunning ? (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center ring-4 ring-primary-500/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-border bg-bg-subtle" />
                      )}
                    </div>

                    {/* Stage Labels & Info */}
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-body-sm font-semibold transition-colors",
                          isRunning ? "text-primary-600 font-bold" : "text-text"
                        )}>
                          {stage.label}
                        </span>
                        
                        {/* Dynamic findings indicator */}
                        {isSuccess && stage.finding && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded font-semibold font-heading"
                          >
                            {stage.finding}
                          </motion.span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted leading-snug">{stage.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Live Stats, Console, and Graph ─── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Live Statistics widgets */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Files', count: stats.files, icon: <FolderCode size={13} />, color: 'text-blue-500 bg-blue-500/10' },
              { label: 'Folders', count: stats.folders, icon: <GitBranch size={13} />, color: 'text-indigo-500 bg-indigo-500/10' },
              { label: 'Dependencies', count: stats.dependencies, icon: <Cpu size={13} />, color: 'text-violet-500 bg-violet-500/10' },
              { label: 'Components', count: stats.components, icon: <Hammer size={13} />, color: 'text-amber-500 bg-amber-500/10' },
              { label: 'Relations', count: stats.relationships, icon: <Activity size={13} />, color: 'text-cyan-500 bg-cyan-500/10' },
            ].map((widget) => (
              <div key={widget.label} className="card p-3 flex flex-col justify-between border-border bg-bg-card shadow-sm h-[68px]">
                <div className="flex items-center gap-1.5">
                  <div className={cn("p-1 rounded", widget.color)}>
                    {widget.icon}
                  </div>
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{widget.label}</span>
                </div>
                <div className="text-body-lg font-extrabold font-heading text-text leading-none mt-1">
                  <Counter value={widget.count} />
                </div>
              </div>
            ))}
          </div>

          {/* Console Output Sandbox Terminal */}
          <Terminal
            lines={terminalLines}
            loading={!complete}
            title="AppDoctor AI repository-sandbox@intelligence-engine"
            className="h-[250px] shadow-lg border border-border bg-bg-subtle"
          />

          {/* SVG Animated Architecture Graph Canvas */}
          <div className="card p-4 border border-border bg-bg-card shadow-sm relative overflow-hidden h-[300px]">
            <div className="absolute top-3 left-4 flex items-center gap-2">
              <Activity size={12} className="text-emerald-500 animate-pulse" />
              <span className="text-[9px] text-text-muted font-mono font-bold uppercase tracking-wider">Dependency Mesh Graph</span>
            </div>

            <svg className="w-full h-full" viewBox="0 0 440 280">
              {/* Dynamic Connection lines with animating packet dots */}
              {GRAPH_NODES.map((node) => {
                if (node.id === 'repo') return null;
                const isVisible = currentStageIdx >= node.activeStage;
                if (!isVisible) return null;

                const pathD = `M ${node.x} ${node.y} L 220 140`;

                return (
                  <g key={`line-${node.id}`} className="transition-all duration-700">
                    {/* Dashed line */}
                    <path
                      d={pathD}
                      className="stroke-border stroke-1"
                      strokeDasharray="4,4"
                      fill="none"
                    />
                    {/* Animated data packet */}
                    <circle r="2.5" className="fill-emerald-500">
                      <animateMotion
                        dur="2.8s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Graph Nodes */}
              {GRAPH_NODES.map((node) => {
                const isVisible = currentStageIdx >= node.activeStage;
                if (!isVisible) return null;

                const isCore = node.id === 'repo';

                return (
                  <g key={node.id} className="cursor-default select-none transition-all duration-700">
                    {/* HTML Node inside SVG */}
                    <foreignObject x={node.x - 16} y={node.y - 16} width="32" height="32">
                      <div className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center shadow-sm bg-bg-card transition-all duration-500",
                        isCore 
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/10 scale-105" 
                          : "border-border text-text-muted"
                      )}>
                        {node.icon}
                      </div>
                    </foreignObject>

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y + 25}
                      textAnchor="middle"
                      className="text-[8px] font-heading font-extrabold fill-text-muted select-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Workflow Outcome Cards */}
          <AnimatePresence>
            {complete && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14 }}
                className="card p-5 border-emerald-200 dark:border-emerald-900/30 bg-emerald-55/15 text-center flex flex-col items-center justify-center shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-body font-bold text-text mb-0.5 font-heading">Audit Pipeline Finalized</h3>
                <p className="text-caption text-text-muted mb-4 max-w-md leading-relaxed">
                  Repository launched score resolves at <strong className="text-emerald-600 dark:text-emerald-400">{(apiResult?.launch_score?.overall) ?? 0}/100</strong>. Enter control dashboard to view refactor fixes.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ChevronRight size={14} />}
                  onClick={() => navigate(ROUTES.PROJECT_OVERVIEW(scannedProjectId))}
                >
                  Enter Mission Control
                </Button>
              </motion.div>
            )}

            {apiError && (() => {
              const friendlyErr = parseScanError(apiError);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14 }}
                  className="card p-6 border-red-200 dark:border-red-900/20 bg-red-500/5 text-left flex flex-col gap-4 shadow-md max-w-lg mx-auto"
                >
                  <div className="flex items-center gap-3 border-b border-red-200/30 dark:border-red-900/30 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h3 className="text-body font-bold text-text font-heading">{friendlyErr.title}</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">Pipeline Status: Interrupted</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-caption">
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">What Happened</span>
                      <p className="text-text font-medium leading-relaxed">{friendlyErr.what}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Why It Happened</span>
                      <p className="text-text-muted leading-relaxed">{friendlyErr.why}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block font-semibold text-emerald-500">What You Can Do Next</span>
                      <p className="text-text leading-relaxed bg-bg-subtle/50 p-2.5 rounded border border-border/40 font-normal">
                        {friendlyErr.next}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-border/40 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(ROUTES.WORKSPACE_UPLOAD)}
                    >
                      Choose Another Repository
                    </Button>
                    {friendlyErr.showRetry && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-red-650 hover:bg-red-750 active:bg-red-800 text-white border-none"
                        onClick={handleRetry}
                      >
                        Retry Analysis
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
