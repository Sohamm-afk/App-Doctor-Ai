import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, TrendingUp, Cloud, Bot, ArrowRight, CheckCircle,
  GitBranch, Rocket, ShieldAlert, Cpu, Hammer, FileText, Check, X,
  Code, Sparkles, AlertTriangle, ArrowDown, Database, Cpu as CpuIcon, Play
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

// ─── Constants & Data ─────────────────────────────────────────────

const STATS = [
  { label: 'Intelligent Analysis Modules', value: '12' },
  { label: 'Specialized AI Agents', value: '4' },
  { label: 'Automated Production Checks', value: '100+' },
  { label: 'Launch Readiness Score', value: '1' },
];

const CAPABILITIES = [
  {
    icon: <Shield size={20} className="text-emerald-600" />,
    label: 'Security Audit',
    desc: 'Automated OWASP Top 10 vulnerability scanner checking for SQL injections, secrets exposure, and package flaws.',
    graphic: (
      <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 font-mono text-[10px] text-red-700 space-y-1">
        <p className="font-bold flex items-center gap-1"><ShieldAlert size={12} /> SQL Injection Risk</p>
        <p className="opacity-80">Line 42: db.raw("SELECT * FROM users WHERE id = " + input)</p>
      </div>
    ),
  },
  {
    icon: <GitBranch size={20} className="text-emerald-600" />,
    label: 'Architecture Visualization',
    desc: 'Auto-generates dependency maps showing CDNs, database configurations, and services interactions directly from code.',
    graphic: (
      <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
        <span className="px-2 py-1 bg-white text-[9px] font-mono rounded border border-border">CDN</span>
        <ArrowRight size={10} className="text-purple-400" />
        <span className="px-2 py-1 bg-primary-500 text-white text-[9px] font-mono rounded">API Gateway</span>
        <ArrowRight size={10} className="text-purple-400" />
        <span className="px-2 py-1 bg-white text-[9px] font-mono rounded border border-border">DB</span>
      </div>
    ),
  },
  {
    icon: <CpuIcon size={20} className="text-emerald-600" />,
    label: 'Performance Analysis',
    desc: 'Identifies runtime inefficiencies, slow database connection threads, and CPU caching failures.',
    graphic: (
      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 font-mono text-[10px] text-amber-700 flex justify-between items-center">
        <span>p95 Latency</span>
        <span className="font-bold text-red-500">420ms (Baseline: 200ms)</span>
      </div>
    ),
  },
  {
    icon: <Cloud size={20} className="text-emerald-600" />,
    label: 'Cloud Cost Prediction',
    desc: 'Translates code components directly into AWS, GCP, and Vercel infrastructure cost estimates.',
    graphic: (
      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 flex justify-between items-center">
        <span className="text-[10px] font-semibold">Monthly Estimated Spend</span>
        <span className="font-bold text-body-md">$1,847/mo</span>
      </div>
    ),
  },
  {
    icon: <TrendingUp size={20} className="text-emerald-600" />,
    label: 'Scalability Simulation',
    desc: 'Models app behavior under 10x or 100x user volumes to pinpoint database locks and autoscaler limits.',
    graphic: (
      <div className="mt-4 p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 space-y-1 text-[10px]">
        <div className="flex justify-between font-bold">
          <span>Concurrency Capacity</span>
          <span>8,500 users</span>
        </div>
        <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-[78%]" />
        </div>
      </div>
    ),
  },
  {
    icon: <AlertTriangle size={20} className="text-emerald-600" />,
    label: 'Technical Debt Detection',
    desc: 'Analyzes design-pattern violations and code duplications to estimate exact remediation hours.',
    graphic: (
      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-border text-text-muted flex justify-between items-center text-[10px]">
        <span>Total Refactor Debt</span>
        <span className="font-bold font-mono">18 tasks · 54 hrs</span>
      </div>
    ),
  },
  {
    icon: <Bot size={20} className="text-emerald-600" />,
    label: 'AI CTO Chat',
    desc: 'A persistent, context-aware engineering chatbot built to answer deep codebase queries.',
    graphic: (
      <div className="mt-4 p-2.5 bg-primary-50 rounded-xl border border-primary-100 text-[10px] text-primary-800 flex gap-2">
        <Bot size={14} className="flex-shrink-0 mt-0.5" />
        <p className="italic">"We found a database leak on orders list."</p>
      </div>
    ),
  },
  {
    icon: <Hammer size={20} className="text-emerald-600" />,
    label: 'One-Click Fixes',
    desc: 'Generates automated code patches to fix security loopholes and package updates.',
    graphic: (
      <div className="mt-4 p-2 bg-gray-900 text-gray-300 rounded-xl border border-gray-800 font-mono text-[9px] space-y-0.5">
        <p className="text-red-400">{"- query = 'SELECT * FROM products WHERE name LIKE \"%' + q + '%\"'"}</p>
        <p className="text-emerald-400">{"+ query = 'SELECT * FROM products WHERE name LIKE ?'"}</p>
      </div>
    ),
  },
  {
    icon: <FileText size={20} className="text-emerald-600" />,
    label: 'Investor Report Generation',
    desc: 'Compiles thorough technical compliance and production readiness audits for external stakeholders.',
    graphic: (
      <div className="mt-4 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between text-blue-800 text-[10px] font-medium">
        <span className="flex items-center gap-1.5"><FileText size={12} /> Executive_Audit.pdf</span>
        <span className="text-[9px] bg-blue-100 px-1.5 py-0.5 rounded font-mono">1.8 MB</span>
      </div>
    ),
  },
];

const AUDIENCES = [
  { title: 'Students', desc: 'Audit class projects, identify architectural errors, and learn enterprise-level deployment practices.' },
  { title: 'Startup Founders', desc: 'Act as your own virtual CTO. Vet offshore code, ensure database safety, and estimate cloud budgets.' },
  { title: 'Developers', desc: 'Eliminate code review blockers. Locate SQL exposures and bottlenecks before opening PRs.' },
  { title: 'Engineering Teams', desc: 'Enforce security compliance and standardized production metrics across microservices.' },
  { title: 'Freelancers', desc: 'Deliver verified, production-ready applications with concrete launch readiness audits.' },
];

// ─── Floating Architecture Network Canvas ───────────────────────

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = 650);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = 650;
    };
    window.addEventListener('resize', handleResize);

    // Nodes definition
    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connection edges
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const db = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + db * db);

          if (dist < 130) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.12 * (1 - dist / 130)})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        node.x += node.vx;
        node.y += node.vy;

        // Bounce boundaries
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 pointer-events-none" />;
}

// ─── Landing Component ────────────────────────────────────────────

export default function LandingPage() {
  const problemRef = useRef<HTMLDivElement>(null);
  const [activePreview, setActivePreview] = useState<'score' | 'security' | 'architecture' | 'cost' | 'fixes'>('score');

  const scrollToWorks = () => {
    problemRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-text font-body selection:bg-primary-100 selection:text-primary-700 overflow-x-hidden">
      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative pt-36 pb-28 border-b border-border flex flex-col items-center justify-center overflow-hidden">
        {/* Floating Background network lines canvas */}
        <NetworkCanvas />

        <div className="w-full max-w-content mx-auto px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="max-w-4xl space-y-6"
          >
            <h1 className="font-heading text-display-lg text-text tracking-tight font-extrabold leading-none">
              Meet Your AI CTO <br />
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                Before You Deploy.
              </span>
            </h1>
            <p className="text-subtitle-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              Modern AI writes code. <br />
              AppDoctor AI decides whether it is ready for production.
            </p>

            {/* Direct access button */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button size="lg" variant="primary" leftIcon={<Rocket size={16} />}>
                <Link to={ROUTES.WORKSPACE}>🚀 Analyze Repository</Link>
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToWorks} rightIcon={<ArrowDown size={15} />}>
                See How It Works
              </Button>
            </div>

            {/* Trust checklist */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-caption text-text-muted font-bold">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> No Setup Required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Analyze Public GitHub Repositories</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> AI-Powered Production Readiness Review</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. THE PROBLEM SECTION ─── */}
      <section ref={problemRef} className="py-24 bg-white border-b border-border scroll-mt-10">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-caption font-bold text-red-500 uppercase tracking-widest block mb-2">The Vulnerability Trap</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">
              Modern AI can write code. But who reviews it?
            </h2>
            <p className="text-body-lg text-text-muted mt-2">
              Today's AI coding assistants generate code quickly, but they don't answer critical deployment questions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Column A: Traditional Deployment Path (Failure) */}
            <div className="card p-8 border-red-100 bg-red-50/5 space-y-6">
              <h3 className="text-h3 font-bold text-red-700 flex items-center gap-2"><X size={20} /> Traditional Path</h3>
              <div className="space-y-4 relative pl-6 border-l border-red-200">
                {[
                  { step: 'Developer Writes Code', desc: 'Code is written rapidly using autocomplete coding copilots.' },
                  { step: 'Pushes to GitHub', desc: 'Code commits are integrated directly without structural verification.' },
                  { step: 'Deploys to Host', desc: 'Deployments build and trigger automatic cloud allocations.' },
                  { step: 'Production Issues Appear', desc: 'Vulnerabilities, database leaks, and cost spikes appear in live environments.' },
                ].map((item, idx) => (
                  <div key={item.step} className="relative">
                    <span className="absolute -left-8.5 top-0.5 w-5 h-5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <h4 className="text-body-sm font-bold text-text">{item.step}</h4>
                    <p className="text-caption text-text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B: AppDoctor Path (Security) */}
            <div className="card p-8 border-emerald-100 bg-emerald-50/5 space-y-6">
              <h3 className="text-h3 font-bold text-emerald-800 flex items-center gap-2"><Check size={20} className="text-emerald-600" /> AppDoctor Path</h3>
              <div className="space-y-4 relative pl-6 border-l border-emerald-200">
                {[
                  { step: 'Repository Uploaded', desc: 'Direct GitHub link mapping takes place in under 5 seconds.' },
                  { step: 'AI Understands Project', desc: 'Dynamic AST parser constructs project infrastructure schemas.' },
                  { step: 'Multi-Agent Security Review', desc: 'Checks OWASP vulnerabilities, leaks, database pooling levels.' },
                  { step: 'Readiness Score Generated', desc: 'Calculates Launch Score with prioritized one-click patches before push.' },
                ].map((item, idx) => (
                  <div key={item.step} className="relative">
                    <span className="absolute -left-8.5 top-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <h4 className="text-body-sm font-bold text-text">{item.step}</h4>
                    <p className="text-caption text-text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. HOW APPDOCTOR WORKS (Horizontal scroll timeline) ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Process</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Horizontal Workflow</h2>
            <p className="text-body-lg text-text-muted mt-1">Four distinct analysis stages inside our Virtual CTO sandbox.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              { step: '1', title: 'GitHub Repository', desc: 'Secure SSH connection pulls repository data directly without storing files.' },
              { step: '2', title: 'AI Understanding Engine', desc: 'Deep parsing maps structural framework frameworks, dependencies, and file structures.' },
              { step: '3', title: 'Multi-Agent Audits', desc: 'Dedicated check modules audit cloud spend, SQL injections, and system scalability.' },
              { step: '4', title: 'Unified Launch Score', desc: 'Consolidated report mapping performance alerts and one-click fixes is prepared.' },
            ].map((s, idx) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="card p-6 bg-white border border-border flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold font-heading mb-4 text-body-sm">
                    {s.step}
                  </div>
                  <h4 className="text-body-sm font-semibold text-text mb-2 font-heading">{s.title}</h4>
                  <p className="text-caption text-text-muted leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. MISSION CONTROL PREVIEW (Interactive) ─── */}
      <section className="py-24 bg-white border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Interface Preview</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Interactive Dashboard</h2>
            <p className="text-body-lg text-text-muted mt-2">
              Explore the core panels of the AppDoctor virtual office. Click tabs below to swap preview screens.
            </p>
          </div>

          {/* Interactive Screen Container */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start max-w-5xl mx-auto">
            {/* Sidebar Tab Menu */}
            <div className="lg:col-span-2 space-y-2">
              {[
                { key: 'score', label: 'Launch Score Board', desc: 'Weighting performance, security, and infrastructure' },
                { key: 'security', label: 'Security Threat Manager', desc: 'Live alerts listing database risks and exposures' },
                { key: 'architecture', label: 'Interactive Architecture Graph', desc: 'Discovered structural service nodes and boundaries' },
                { key: 'cost', label: 'Cloud Optimizer Module', desc: 'Monthly server spend estimates and savings' },
                { key: 'fixes', label: 'One-Click Refactoring Fixes', desc: 'Instant patches applying security recommendations' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActivePreview(tab.key as any)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all text-body-sm flex flex-col justify-start',
                    activePreview === tab.key
                      ? 'bg-primary-500 text-white border-primary-600 shadow-sm'
                      : 'bg-[#FAFAFA] border-border text-text hover:border-primary-200'
                  )}
                >
                  <span className="font-semibold">{tab.label}</span>
                  <span className={cn('text-[10px] mt-0.5', activePreview === tab.key ? 'text-primary-100' : 'text-text-muted')}>{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Live screen preview */}
            <div className="lg:col-span-3 card bg-[#0B0F19] text-gray-300 border border-border min-h-[340px] p-6 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <span className="text-[10px] text-gray-400 font-mono">mission-control / screen-preview</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {activePreview === 'score' && (
                    <motion.div
                      key="score"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 text-center py-6"
                    >
                      <div className="w-20 h-20 rounded-full border-4 border-emerald-500 border-t-transparent flex items-center justify-center mx-auto animate-spin" style={{ animationDuration: '4s' }}>
                        <span className="text-h2 font-bold text-white">74</span>
                      </div>
                      <h4 className="text-body-sm font-semibold text-white">Production Score: 74/100</h4>
                      <p className="text-caption text-gray-400 max-w-sm mx-auto">Vulnerabilities and database locks have dropped the launch score index. Fix issues to secure pipeline.</p>
                    </motion.div>
                  )}

                  {activePreview === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h4 className="text-body-sm font-semibold text-white">Detected Threats</h4>
                      <div className="space-y-2 font-mono text-[10px]">
                        <div className="flex justify-between bg-red-950/20 p-2.5 rounded border border-red-900/30 text-red-400">
                          <span>SQL Injection Vulnerability (search.ts:42)</span>
                          <span className="font-bold">CRITICAL</span>
                        </div>
                        <div className="flex justify-between bg-amber-950/20 p-2.5 rounded border border-amber-900/30 text-amber-400">
                          <span>Exposed AWS Secrets String (config.json)</span>
                          <span className="font-bold">HIGH</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePreview === 'architecture' && (
                    <motion.div
                      key="architecture"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-center gap-3 items-center py-8"
                    >
                      <span className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded font-mono text-[10px]">CDN</span>
                      <span className="text-emerald-500 text-body-sm">→</span>
                      <span className="px-2.5 py-1.5 bg-primary-600 text-white rounded font-mono text-[10px] font-bold">API Gateway</span>
                      <span className="text-emerald-500 text-body-sm">→</span>
                      <span className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded font-mono text-[10px]">Postgres</span>
                    </motion.div>
                  )}

                  {activePreview === 'cost' && (
                    <motion.div
                      key="cost"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 text-center py-6"
                    >
                      <span className="text-caption text-gray-400 uppercase">Monthly Cloud Projection</span>
                      <p className="text-display-sm font-bold text-white">$1,847/mo</p>
                      <p className="text-caption text-emerald-400 font-bold">Potential Savings: $521/mo (28%)</p>
                    </motion.div>
                  )}

                  {activePreview === 'fixes' && (
                    <motion.div
                      key="fixes"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h4 className="text-body-sm font-semibold text-white">Suggested Patches</h4>
                      <div className="bg-gray-950 p-3 rounded-lg border border-gray-900 font-mono text-[9px] text-gray-300 space-y-1">
                        <p className="text-red-400">{"- query = 'SELECT * FROM users WHERE name = ' + q"}</p>
                        <p className="text-emerald-400">{"+ query = 'SELECT * FROM users WHERE name = ?'"}</p>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[10px] transition-colors">Apply Fix</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CAPABILITIES SECTION ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Capabilities</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">
              Platform Features
            </h2>
            <p className="text-body-lg text-text-muted mt-2">
              Every tool required to audit project readiness packaged in a single workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.label}
                className="card p-6 bg-white border border-border flex flex-col justify-between hover:border-primary-300 transition-colors group cursor-default"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-5 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                    {cap.icon}
                  </div>
                  <h3 className="text-body-md font-bold text-text mb-2 font-heading">{cap.label}</h3>
                  <p className="text-body-sm text-text-muted leading-relaxed">{cap.desc}</p>
                </div>
                {cap.graphic}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. WHY DEVELOPERS NEED THIS ─── */}
      <section className="py-24 bg-white border-b border-border">
        <div className="w-full max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Workflow Analysis</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Unified Audit Platform</h2>
            <p className="text-body-lg text-text-muted mt-1">Replacing fragmented operations with intelligent automation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Traditional */}
            <div className="card p-8 border-red-100 bg-red-50/10 space-y-4">
              <h3 className="text-h4 font-bold text-red-700 font-heading">Traditional Development</h3>
              <ul className="space-y-3.5 text-body-sm text-text-muted">
                <li className="flex items-start gap-2.5"><span className="text-red-500 font-bold">✕</span> Separate static security scanners</li>
                <li className="flex items-start gap-2.5"><span className="text-red-500 font-bold">✕</span> Out-of-date manual cloud cost calculators</li>
                <li className="flex items-start gap-2.5"><span className="text-red-500 font-bold">✕</span> Fragmented architectural graphs</li>
                <li className="flex items-start gap-2.5"><span className="text-red-500 font-bold">✕</span> Guesswork regarding actual scale capacity limits</li>
              </ul>
            </div>

            {/* AppDoctor */}
            <div className="card p-8 border-emerald-200 bg-emerald-50/10 space-y-4">
              <h3 className="text-h4 font-bold text-emerald-800 font-heading">AppDoctor AI</h3>
              <ul className="space-y-3.5 text-body-sm text-text">
                <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-bold">✓</span> One intelligent unified operations platform</li>
                <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-bold">✓</span> Persistent AI CTO conversational guidance</li>
                <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-bold">✓</span> Consolidated production readiness reviews</li>
                <li className="flex items-start gap-2.5"><span className="text-emerald-500 font-bold">✓</span> Actionable, one-click patch configurations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. WHO IS THIS FOR ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Audience</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Who Is This For?</h2>
            <p className="text-body-lg text-text-muted mt-1">Bringing architectural oversight to every profile.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {AUDIENCES.map((aud) => (
              <div key={aud.title} className="card p-6 bg-white border border-border flex flex-col justify-between">
                <div>
                  <h4 className="text-body-sm font-bold text-text mb-2 font-heading">{aud.title}</h4>
                  <p className="text-caption text-text-muted leading-relaxed">{aud.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FINAL CTA ─── */}
      <section className="py-24 bg-white">
        <div className="w-full max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card p-12 bg-[#FAFAFA] border border-border relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl opacity-50 -z-10" />
            <div className="w-12 h-12 rounded-xl bg-primary-500 text-white flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Zap size={20} />
            </div>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading mb-3">
              Ready to know if your application is production ready?
            </h2>
            <p className="text-body-md text-text-muted mb-8">
              Start analyzing your repository in under two minutes.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" variant="primary" leftIcon={<Rocket size={16} />}>
                <Link to={ROUTES.WORKSPACE}>Open Workspace</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 9. MINIMAL FOOTER ─── */}
      <footer className="py-12 bg-white text-caption text-text-subtle border-t border-border">
        <div className="w-full max-w-content mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 AppDoctor AI. All rights reserved. Hackathon MVP.</p>
          <div className="flex items-center gap-6 font-semibold">
            <a href="#" className="hover:text-text transition-colors">About</a>
            <a href="#" className="hover:text-text transition-colors">Features</a>
            <a href="#" className="hover:text-text transition-colors">GitHub</a>
            <a href="#" className="hover:text-text transition-colors">Privacy</a>
            <a href="#" className="hover:text-text transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
