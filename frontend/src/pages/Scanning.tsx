import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2, ChevronRight, Play, Terminal as TermIcon, ShieldAlert } from 'lucide-react';
import { Terminal } from '@/components/terminal/Terminal';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

// Stages definition
interface ScanStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success';
  logs: string[];
}

const INITIAL_STAGES: ScanStage[] = [
  { id: '1', label: 'Connecting to GitHub', status: 'pending', logs: ['Initializing sandbox tunnel...', 'Contacting github.com via secure client SSH...', 'Connection established successfully.'] },
  { id: '2', label: 'Cloning Repository', status: 'pending', logs: ['Cloning master branch of E-Commerce Platform...', 'Fetching file tree structure...', 'Cloned 2,869 modules successfully in 1.4s.'] },
  { id: '3', label: 'Reading Project Structure', status: 'pending', logs: ['Indexing files metadata...', 'Scanning directory paths...', 'Found package.json, tsconfig.json, vite.config.ts, src/.'] },
  { id: '4', label: 'Detecting Languages', status: 'pending', logs: ['Analyzing source file extensions...', 'Discovered: TypeScript (92%), CSS (6%), HTML (2%).'] },
  { id: '5', label: 'Detecting Frameworks', status: 'pending', logs: ['Resolving packages manifest...', 'Primary framework detected: React 18.2 with Tailwind CSS.'] },
  { id: '6', label: 'Building Dependency Graph', status: 'pending', logs: ['Parsing imports tree...', 'Resolving 358 nested packages...', 'Graph generated successfully.'] },
  { id: '7', label: 'Understanding Architecture', status: 'pending', logs: ['Mapping microservices dependencies...', 'Identified: CDN, API Gateway, Redis Cache, Postgres DB nodes.'] },
  { id: '8', label: 'Running Security Analysis', status: 'pending', logs: ['Scanning for code injection flaws...', 'WARNING: SQL injection vulnerability detected in search.ts line 42.', 'Scanning secrets... WARNING: AWS Access token key candidate exposed in configuration.'] },
  { id: '9', label: 'Performance Review', status: 'pending', logs: ['Evaluating response times...', 'Detected query connection pooling lag: p95 latency is 420ms (Warning threshold: 300ms).'] },
  { id: '10', label: 'Cloud Cost Prediction', status: 'pending', logs: ['Simulating server cost configurations...', 'Cost forecast: $1,847/month.', 'Identified $521/month potential savings.'] },
  { id: '11', label: 'AI CTO Discussion', status: 'pending', logs: ['Spinning virtual CTO specialist agents...', 'Discussing launch score mitigation strategies...', 'Remediation plan generated.'] },
  { id: '12', label: 'Calculating Launch Score', status: 'pending', logs: ['Weighting vulnerabilities, bottlenecks, and costs...', 'Launch Score resolved: 74/100 (Caution required).'] },
];

export default function ScanningPage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<ScanStage[]>(INITIAL_STAGES);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [terminalLines, setTerminalLines] = useState<any[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (currentStageIdx >= stages.length) {
      setComplete(true);
      return;
    }

    // Set current stage to 'running'
    setStages((prev) =>
      prev.map((s, idx) => {
        if (idx === currentStageIdx) return { ...s, status: 'running' };
        return s;
      })
    );

    const activeStage = stages[currentStageIdx];
    let logIdx = 0;

    // Verbose log additions
    const logInterval = setInterval(() => {
      if (logIdx < activeStage.logs.length) {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `line-${currentStageIdx}-${logIdx}`,
            type: activeStage.logs[logIdx].includes('WARNING') ? 'warning' : 'info',
            content: activeStage.logs[logIdx],
          },
        ]);
        logIdx++;
      } else {
        clearInterval(logInterval);

        // Mark current stage 'success'
        setStages((prev) =>
          prev.map((s, idx) => {
            if (idx === currentStageIdx) return { ...s, status: 'success' };
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
  }, [currentStageIdx]);

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

          <div className="card p-6 bg-white border border-border space-y-3">
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
                  onClick={() => navigate(ROUTES.PROJECT_OVERVIEW('proj-001'))}
                >
                  Enter Mission Control
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
