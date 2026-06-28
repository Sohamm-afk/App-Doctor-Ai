import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, TrendingUp, Cloud, Bot, ArrowRight, CheckCircle,
  GitBranch, Rocket, ShieldAlert, Cpu, Hammer, FileText, Check, X,
  Code, Sparkles, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

// ─── Capability Cards Data ───────────────────────────────────────
const CAPABILITIES = [
  {
    icon: <Shield size={20} className="text-emerald-600" />,
    label: 'Security Audit',
    desc: 'Automated OWASP Top 10 vulnerability scanner checking for SQL injections, secrets exposure, and packages flaws.',
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
    icon: <Cpu size={20} className="text-emerald-600" />,
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
        <p className="text-red-400">- query = 'SELECT * FROM products WHERE name LIKE "%' + q + '%"'</p>
        <p className="text-emerald-400">+ query = "SELECT * FROM products WHERE name LIKE ?"</p>
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


// ─── Who Is This For Data ─────────────────────────────────────────
const AUDIENCES = [
  { title: 'Students', desc: 'Audit class projects, identify architectural errors, and learn enterprise-level deployment practices.' },
  { title: 'Startup Founders', desc: 'Act as your own virtual CTO. Vet offshore code, ensure database safety, and estimate cloud budgets.' },
  { title: 'Developers', desc: 'Eliminate code review blockers. Locate SQL exposures and bottlenecks before opening PRs.' },
  { title: 'Engineering Teams', desc: 'Enforce security compliance and standardized production metrics across microservices.' },
  { title: 'Freelancers', desc: 'Deliver verified, production-ready applications with concrete launch readiness audits.' },
];

const STATS = [
  { label: 'Intelligent Analysis Modules', value: '12' },
  { label: 'Specialized AI Agents', value: '4' },
  { label: 'Automated Production Checks', value: '100+' },
  { label: 'Launch Readiness Score', value: '1' },
];

// ─── Animation Variants ───────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-text font-body selection:bg-primary-100 selection:text-primary-700">
      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-24 border-b border-border flex items-center justify-center overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 -z-10" />

        <div className="w-full max-w-content mx-auto px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <h1 className="font-heading text-display-lg text-text tracking-tight font-extrabold leading-none mb-6">
              Meet Your AI CTO <br />
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                Before You Deploy
              </span>
            </h1>
            <p className="text-subtitle-lg text-text-muted max-w-3xl mx-auto mb-10 leading-relaxed">
              AppDoctor AI analyzes your entire software project before deployment, reviews security, architecture, scalability, cloud costs, technical debt and business readiness, then tells you exactly what to fix before shipping to production.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" variant="primary" leftIcon={<Rocket size={16} />}>
                <Link to={ROUTES.WORKSPACE}>Open Workspace</Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-caption text-text-muted font-semibold">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> No Setup Required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Analyze Public GitHub Repositories</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> AI-Powered Production Readiness Review</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Real Product Stats ─── */}
      <section className="border-b border-border bg-white">
        <div className="w-full max-w-content mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border text-center">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              className="py-10 px-4"
            >
              <span className="text-display-md font-bold text-text tracking-tight font-heading block">
                {stat.value}
              </span>
              <span className="text-caption text-text-muted mt-1 uppercase font-bold tracking-wider block">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── The Problem Section ─── */}
      <section className="py-24 bg-white border-b border-border">
        <div className="w-full max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span className="text-caption font-bold text-red-500 uppercase tracking-widest block">The Reality</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading max-w-2xl mx-auto">
              Modern AI can write code. <br />
              <span className="text-red-500">But who reviews the entire application before production?</span>
            </h2>
            <p className="text-body-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              Today's AI coding assistants generate code quickly, but they don't answer critical deployment questions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6 text-left max-w-3xl mx-auto">
              {[
                'Is my application secure?',
                'Will it scale to thousands of users?',
                'Is my architecture correct?',
                'Am I exposing secrets?',
                'How much will cloud infrastructure cost?',
                'Can I safely deploy today?',
              ].map((item) => (
                <div key={item} className="p-4 bg-bg-subtle rounded-xl border border-border flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span className="text-body-sm font-medium text-text">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-body-md text-text font-medium pt-4">
              Developers often discover these issues after deployment. AppDoctor AI finds them before your users do.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works (5-step timeline) ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Workflow</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">How AppDoctor AI Works</h2>
            <p className="text-body-lg text-text-muted mt-1">Five simple steps to verify your application's readiness.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {[
              { step: '1', title: 'Upload GitHub Repository', desc: 'Paste repository link or drop zip folder. Complete code sandboxing ensures zero data leaks.' },
              { step: '2', title: 'AI Understands Project', desc: 'Codebase parser constructs complete logical mapping, language structure, and framework dependencies.' },
              { step: '3', title: 'AI Specialists Analyze', desc: 'Dedicated AI models assess vulnerabilities, performance issues, database locks, and cloud spend estimates.' },
              { step: '4', title: 'Receive Launch Score', desc: 'A unified Production Readiness score from 1-100 with prioritised, actionable remediation code patches.' },
              { step: '5', title: 'Deploy with Confidence', desc: 'Apply fixes in one click and release updates to production with complete structural transparency.' },
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
                {idx < 4 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 text-text-subtle font-heading text-h2 z-10 opacity-30">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mission Control Preview ─── */}
      <section className="py-24 bg-white border-b border-border overflow-hidden">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Preview</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Mission Control Dashboard</h2>
            <p className="text-body-lg text-text-muted mt-1">Audit operations center for code health, cloud spend, and security fixes.</p>
          </div>

          {/* Interactive Mock Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border bg-[#0B0F19] text-gray-300 shadow-xl overflow-hidden p-6 max-w-4xl mx-auto space-y-6"
          >
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-caption text-gray-400 font-mono ml-2">appdoctor.ai / dashboard / Overview</span>
              </div>
              <span className="text-caption bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-bold font-mono">
                Launch Score: 74/100
              </span>
            </div>

            {/* Content row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Box 1 */}
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-3">
                <p className="text-caption text-gray-400 uppercase font-semibold">Security Tracker</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-red-950/20 p-2 rounded border border-red-900/30 text-[10px] text-red-400">
                    <span>SQL Injection Risk</span>
                    <span className="font-bold">CRITICAL</span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-950/20 p-2 rounded border border-amber-900/30 text-[10px] text-amber-400">
                    <span>AWS Access Token Exposed</span>
                    <span className="font-bold">HIGH</span>
                  </div>
                </div>
              </div>

              {/* Box 2 */}
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-3">
                <p className="text-caption text-gray-400 uppercase font-semibold">Cloud Cost Estimate</p>
                <p className="text-h2 font-bold text-white font-heading">$1,847/mo</p>
                <p className="text-caption text-emerald-400">✓ AI saving checks show $521/mo potential savings</p>
              </div>

              {/* Box 3 */}
              <div className="bg-gray-950 p-5 rounded-xl border border-gray-900 space-y-3">
                <p className="text-caption text-gray-400 uppercase font-semibold">AI CTO Console</p>
                <div className="space-y-1 text-[10px]">
                  <p className="text-emerald-400">Bot: "Database session capacity reached at 8k users. Downgrade EC2 size."</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Capabilities Section ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Features</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">
              Platform Capabilities
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

      {/* ─── Why AppDoctor AI Comparison Section ─── */}
      <section className="py-24 bg-white border-b border-border">
        <div className="w-full max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Contrast</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Why AppDoctor AI?</h2>
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

      {/* ─── Who Is This For ─── */}
      <section className="py-24 bg-[#FAFAFA] border-b border-border">
        <div className="w-full max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block mb-2">Audience</span>
            <h2 className="text-h1 font-bold text-text tracking-tight font-heading">Who Is This For?</h2>
            <p className="text-body-lg text-text-muted mt-1">Architected to bring technical oversight to every developer profile.</p>
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

      {/* ─── Why Judges Should Care ─── */}
      <section className="py-24 bg-white border-b border-border">
        <div className="w-full max-w-4xl mx-auto px-6 text-center space-y-6">
          <span className="text-caption font-bold text-primary-600 uppercase tracking-widest block">Hackathon Review</span>
          <h2 className="text-h1 font-bold text-text tracking-tight font-heading">
            More AI writes code every day. <br />
            <span className="text-primary-500">Someone needs to review it before deployment.</span>
          </h2>
          <p className="text-body-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
            AI coding agents can rapidly scale code creation, but they increase the risk of insecure or unscalable code deployment. AppDoctor AI acts as the essential production gatekeeper—an AI-powered Virtual CTO helping developers launch compliant, stable, and ready software in minutes.
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="w-full max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card p-12 bg-white border border-border relative overflow-hidden"
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

      {/* ─── Minimal Footer ─── */}
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
