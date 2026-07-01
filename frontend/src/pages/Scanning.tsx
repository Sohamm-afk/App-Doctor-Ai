import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2, ChevronRight, Play, Terminal as TermIcon, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { Terminal } from '@/components/terminal/Terminal';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import { useToast } from '@/components/ui/Toast';
import { MOCK_PROJECTS } from '@/mocks/projects';

// Stages definition
interface ScanStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  logs: string[];
}

const INITIAL_STAGES: ScanStage[] = [
  { id: '1', label: 'Connecting to GitHub', status: 'pending', logs: ['Initializing sandbox tunnel...', 'Contacting github.com via secure client SSH...', 'Connection established successfully.'] },
  { id: '2', label: 'Cloning Repository', status: 'pending', logs: ['Cloning master branch of repository...', 'Fetching file tree structure...', 'Cloned remote modules successfully.'] },
  { id: '3', label: 'Reading Project Structure', status: 'pending', logs: ['Indexing files metadata...', 'Scanning directory paths...', 'Resolving config manifests...'] },
  { id: '4', label: 'Detecting Languages', status: 'pending', logs: ['Analyzing source file extensions...', 'Discovered project source code languages.'] },
  { id: '5', label: 'Detecting Frameworks', status: 'pending', logs: ['Resolving packages manifest...', 'Primary stack framework detected.'] },
  { id: '6', label: 'Building Dependency Graph', status: 'pending', logs: ['Parsing imports tree...', 'Resolving package dependencies...', 'Graph generated successfully.'] },
  { id: '7', label: 'Understanding Architecture', status: 'pending', logs: ['Mapping microservices dependencies...', 'Identified service and datastore nodes.'] },
  { id: '8', label: 'Running Security Analysis', status: 'pending', logs: ['Scanning for code injection flaws...', 'WARNING: SQL injection vulnerability detected in search.ts line 42.', 'Scanning secrets... WARNING: AWS Access token key candidate exposed in configuration.'] },
  { id: '9', label: 'Performance Review', status: 'pending', logs: ['Evaluating response times...', 'Detected query connection pooling lag: p95 latency is 420ms (Warning threshold: 300ms).'] },
  { id: '10', label: 'Cloud Cost Prediction', status: 'pending', logs: ['Simulating server cost configurations...', 'Cost forecast: $1,847/month.', 'Identified $521/month potential savings.'] },
  { id: '11', label: 'AI CTO Discussion', status: 'pending', logs: ['Spinning virtual CTO specialist agents...', 'Discussing launch score mitigation strategies...', 'Remediation plan generated.'] },
  { id: '12', label: 'Calculating Launch Score', status: 'pending', logs: ['Weighting vulnerabilities, bottlenecks, and costs...', 'Launch Score resolved: 74/100 (Caution required).'] },
];

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

  // Trigger Backend Analysis API on mount
  useEffect(() => {
    if (!github_url) {
      // Mock run fallback for demo when no URL is supplied
      setApiResult({
        project_name: 'E-Commerce Platform',
        repository_name: 'proj-001',
        project_type: 'Full Stack',
        languages: ['TypeScript', 'CSS', 'HTML'],
        frontend: 'React',
        backend: 'Next.js',
        package_manager: 'npm',
        docker_supported: false,
        readme: true,
        file_count: 2869,
        folder_count: 120,
      });
      return;
    }

    setApiLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

    axios.post(`${apiBaseUrl}/api/analyze`, { github_url })
      .then((res) => {
        const data = res.data;
        setApiResult(data);
        setApiLoading(false);

        // Map backend analysis to frontend Project schema
        const projId = data.repository_name || 'proj-' + Math.random().toString(36).substr(2, 9);
        setScannedProjectId(projId);

        // Safely push to mock projects database
        if (!MOCK_PROJECTS.some((p) => p.id === projId)) {
          MOCK_PROJECTS.push({
            id: projId,
            name: data.project_name || 'Unnamed Repository',
            description: `Analysis details for ${data.repository_name || 'project'}. Detected type: ${data.project_type || 'Unknown'}. Size: ${data.repository_size || 'Small'}.`,
            repositoryUrl: github_url || '',
            language: (((data.languages || [])[0] || 'unknown').toLowerCase() as any),
            framework: data.frontend || data.backend || 'Other',
            status: 'active',
            launchScore: 74,
            lastScannedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cloudProvider: 'other',
            teamSize: 1,
            tags: data.languages || [],
          });
        }

        // Dynamically customize log text for specific stages
        setStages((prev) =>
          prev.map((stage) => {
            if (stage.id === '2') {
              return {
                ...stage,
                logs: [
                  `Cloning master branch of ${data.repository_name || 'repository'}...`,
                  'Fetching remote file tree structure...',
                  `Successfully fetched ${data.file_count || 0} files.`,
                ],
              };
            }
            if (stage.id === '3') {
              return {
                ...stage,
                logs: [
                  'Indexing files metadata...',
                  `Found ${data.file_count || 0} files across ${data.folder_count || 0} folders.`,
                  `Docker supported: ${data.docker_supported ? 'Yes' : 'No'}. README: ${data.readme ? 'Yes' : 'No'}.`,
                ],
              };
            }
            if (stage.id === '4') {
              const langsStr = (data.languages || []).join(', ') || 'unknown';
              return {
                ...stage,
                logs: [
                  'Analyzing source file extensions...',
                  `Discovered: ${langsStr} in repository.`,
                ],
              };
            }
            if (stage.id === '5') {
              const fw = data.frontend || data.backend || 'No major framework';
              return {
                ...stage,
                logs: [
                  'Resolving packages manifest...',
                  `Primary framework detected: ${fw} with ${data.package_manager || 'npm'} package manager.`,
                ],
              };
            }
            return stage;
          })
        );
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Failed to analyze repository';
        setApiError(msg);
        setApiLoading(false);
      });
  }, [github_url]);

  // Stage Processing Effect Loop
  useEffect(() => {
    if (apiError) {
      // Mark current stage as error
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

    // Connect Stage Loop Progression
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
      // Pause stage 3 or 4 progression until API result completes or errors out
      if (activeStage.id === '3' && apiLoading && !apiResult && !apiError) {
        // Keep waiting inside interval, print single waiting log if not printed yet
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

        // Mark current stage 'success'
        setStages((prev) =>
          prev.map((s, idx) => {
            if (idx === currentStageIdx) return { ...s, status: 'success' as const };
            return s;
          })
        );

        // Add checkout check logs
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
        }, 300);
      }
    }, 280);

    return () => clearInterval(logInterval);
  }, [currentStageIdx, apiLoading, apiResult, apiError, stages.length]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left Side: Dynamic Pipeline Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="font-heading text-h2 text-text mb-1 tracking-tight">
              {complete ? 'Analysis Complete' : 'AI Operating System Audit'}
            </h1>
            <p className="text-body-sm text-text-muted">
              {complete
                ? 'AppDoctor virtual agents have finalized your review.'
                : `Active Phase: ${stages[currentStageIdx]?.label || 'Resolving...'}`}
            </p>
          </div>

          <div className="card p-6 bg-bg-card border border-border space-y-3">
            {stages.map((stage, idx) => {
              const isPending = stage.status === 'pending';
              const isRunning = stage.status === 'running';
              const isSuccess = stage.status === 'success';

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-3 py-1.5 transition-opacity duration-200',
                    isPending && 'opacity-30',
                    isRunning && 'opacity-100 font-semibold',
                    isSuccess && 'opacity-80'
                  )}
                >
                  <div className="flex-shrink-0">
                    {isSuccess ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    ) : isRunning ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-primary-500 border border-primary-200 ring-2 ring-primary-100 animate-ping" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-border bg-bg-subtle" />
                    )}
                  </div>
                  <span className="text-body-sm text-text">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Virtual Agents Sandbox Console */}
        <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
          <Terminal
            lines={terminalLines}
            loading={!complete}
            title="AppDoctor AI virtual-sandbox@cto-agent"
            className="flex-1 min-h-[380px] shadow-lg border border-border"
          />

          <AnimatePresence>
            {complete && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16 }}
                className="card p-6 border-emerald-100 bg-emerald-50/20 text-center flex flex-col items-center justify-center shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-h3 font-bold text-text mb-1 font-heading">Sandbox Analysis Complete</h3>
                <p className="text-body-sm text-text-muted mb-4 max-w-sm">
                  Launch readiness score has been resolved at <strong className="text-amber-600">74/100</strong>. Issues and optimization fixes are listed.
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

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16 }}
                className="card p-6 border-red-100 bg-red-50/10 text-center flex flex-col items-center justify-center shadow-sm animate-pulse"
              >
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="text-h3 font-bold text-text mb-1 font-heading">Sandbox Analysis Failed</h3>
                <p className="text-body-sm text-text-muted mb-4 max-w-sm">
                  {apiError}
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(ROUTES.WORKSPACE_UPLOAD)}
                >
                  Try Another Repository
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
