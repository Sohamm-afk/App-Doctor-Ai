import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, User, Lightbulb, ShieldAlert, Cpu, RotateCcw, Shuffle } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { InformationCard } from '@/components/cards/Cards';
import { useToast } from '@/components/ui/Toast';
import type { ChatMessage } from '@/types';

// ─── Dynamic question generator ─────────────────────────────────────────────
//
// Builds a priority-weighted question pool from real scan signals.
// Higher priority = more likely to surface in the top-6 shown.

interface QuestionCandidate {
  text: string;
  priority: number;
  category: 'security' | 'architecture' | 'performance' | 'deployment' | 'quality' | 'general';
}

function generateSuggestedQuestions(scanResult: any): string[] {
  if (!scanResult) return [
    'Explain the architecture of this repository.',
    'Is this repository production-ready?',
    'What should I fix first?',
    'What are my biggest security risks?',
    'What is the highest priority technical debt?',
    'What is my biggest scalability risk?',
  ];

  const profile   = scanResult.repositoryProfile || {};
  const security  = (scanResult.security_findings  || []) as any[];
  const perf      = (scanResult.performance_findings || []) as any[];
  const quality   = (scanResult.quality_findings   || []) as any[];
  const score     = scanResult.launch_score || {};

  // Helper: extract string value from Fact objects or plain strings
  const v = (item: any, fallback = ''): string => {
    if (!item) return fallback;
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && 'value' in item) return String(item.value || fallback);
    return fallback;
  };

  const framework   = v(profile.framework);
  const pattern     = v(profile.architecturePattern);
  const repoType    = v(profile.repositoryType);
  const runtime     = v(profile.runtime);
  const database    = v(profile.database);
  const hasTests    = !!profile.hasTests;
  const hasDocker   = !!profile.hasDocker;
  const hasCI       = !!profile.hasCI;
  const overallScore = score.overall ?? 100;
  const secScore    = score.security ?? 100;
  const perfScore   = score.performance ?? 100;

  const criticalCount = security.filter(f => f.severity === 'critical').length;
  const highCount     = security.filter(f => f.severity === 'high').length;
  const mediumCount   = security.filter(f => f.severity === 'medium').length;
  const todoCount     = quality.filter((q: any) => /todo/i.test(q.title || '')).length;
  const fixmeCount    = quality.filter((q: any) => /fixme/i.test(q.title || '')).length;

  const pool: QuestionCandidate[] = [];
  const add = (text: string, priority: number, category: QuestionCandidate['category']) =>
    pool.push({ text, priority, category });

  // ── Architecture (always relevant) ──────────────────────────────────────
  if (pattern && pattern !== 'Unknown' && pattern !== 'None') {
    add(`Explain the ${pattern} pattern used in this repository.`, 8, 'architecture');
  } else {
    add('Explain the architecture of this repository.', 8, 'architecture');
  }
  add('What is the weakest part of this architecture?', 6, 'architecture');
  if (repoType && repoType !== 'Unknown') {
    add(`What are the most important scalability concerns for a ${repoType}?`, 5, 'architecture');
  } else {
    add('What is my biggest scalability risk as usage grows?', 5, 'architecture');
  }
  if (framework && framework !== 'None' && framework !== 'None Detected') {
    add(`What ${framework} best practices am I missing in this project?`, 5, 'architecture');
  }

  // ── Security ────────────────────────────────────────────────────────────
  if (criticalCount > 0) {
    add(
      `I have ${criticalCount} critical security ${criticalCount === 1 ? 'vulnerability' : 'vulnerabilities'}. What should I fix first?`,
      10, 'security'
    );
    add('How do I prevent these critical vulnerabilities from reaching production?', 9, 'security');
  } else if (highCount > 0) {
    add(`There are ${highCount} high-severity issues. How serious are they?`, 9, 'security');
    add('Walk me through the most urgent security fixes.', 8, 'security');
  } else if (mediumCount > 0) {
    add('I have only medium and low security issues. Am I safe to deploy?', 6, 'security');
  } else {
    add('The security scan is clean. What should I do to keep it that way?', 5, 'security');
  }
  if (secScore < 70) {
    add('My security score is low. What is the fastest way to improve it?', 8, 'security');
  }

  // ── Deployment / Production readiness ───────────────────────────────────
  if (!hasDocker && !hasCI) {
    add('What infrastructure do I need to set up before deploying to production?', 7, 'deployment');
    add('How do I containerize and deploy this project for the first time?', 7, 'deployment');
  } else if (!hasDocker) {
    add('Should I add Docker support before deploying? How?', 6, 'deployment');
  } else if (!hasCI) {
    add('I have Docker but no CI/CD pipeline. What should I set up first?', 7, 'deployment');
  } else {
    add('Can I safely deploy this repository to production today?', 7, 'deployment');
  }
  if (overallScore < 75) {
    add(`My score is ${overallScore}/100. What is specifically holding it back?`, 8, 'deployment');
  } else if (overallScore >= 85) {
    add('My score looks healthy. What would push it to 100?', 5, 'deployment');
  }

  // ── Testing ─────────────────────────────────────────────────────────────
  if (!hasTests) {
    add('There are no automated tests. What testing strategy should I implement first?', 9, 'quality');
    add('How do missing tests impact my production deployment risk?', 8, 'quality');
  } else {
    add('How can I improve my test coverage and quality?', 4, 'quality');
  }

  // ── Performance ─────────────────────────────────────────────────────────
  if (perf.length > 3) {
    add('Where are the biggest performance bottlenecks in this codebase?', 7, 'performance');
    add('Which performance issues will hurt me first under real traffic?', 6, 'performance');
  } else if (perf.length > 0) {
    add('Are the detected performance issues serious enough to fix before launch?', 6, 'performance');
  } else if (perfScore >= 90) {
    add('My performance looks good. What should I monitor in production?', 4, 'performance');
  }

  // ── Technical debt ───────────────────────────────────────────────────────
  if (todoCount + fixmeCount > 5) {
    add(`There are ${todoCount + fixmeCount} TODO/FIXME comments. Which ones actually matter?`, 7, 'quality');
  }
  if (quality.length > 10) {
    add('If I had one sprint to reduce technical debt, what would you prioritize?', 7, 'quality');
  } else if (quality.length > 0) {
    add('What is the highest priority technical debt I should address?', 6, 'quality');
  }

  // ── Database / Data layer ────────────────────────────────────────────────
  if (database && database !== 'Not Detected' && database !== 'None') {
    add(`What are the key risks with my ${database} setup as this scales?`, 5, 'performance');
  }

  // ── General high-value questions ─────────────────────────────────────────
  add('What would you fix in the next 30 days to make this production-ready?', 5, 'general');
  add('What are the top 3 engineering improvements I should make right now?', 5, 'general');
  if (runtime && runtime !== 'Unknown') {
    add(`What are the most common ${runtime} production pitfalls I should avoid?`, 4, 'general');
  }

  // ── Sort by priority desc, deduplicate, return top 6 ────────────────────
  pool.sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of pool) {
    if (!seen.has(item.text) && result.length < 6) {
      seen.add(item.text);
      result.push(item.text);
    }
  }
  return result;
}

/** Shuffles an array in-place (Fisher-Yates) and returns a new array */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

// Map emoji section headers to accent colours
const SECTION_COLORS: Record<string, string> = {
  '\ud83c\udfaf': '#6366f1', // Executive Assessment — indigo
  '\ud83d\udd2c': '#0ea5e9', // Technical Analysis   — sky
  '\ud83d\udccb': '#64748b', // Evidence             — slate
  '\ud83d\udcbc': '#f59e0b', // Business Impact      — amber
  '\u2705': '#10b981',      // Recommendation       — emerald
  '\u23f1': '#8b5cf6',      // Estimated Effort     — violet
};

function sectionAccent(line: string): string {
  for (const [emoji, color] of Object.entries(SECTION_COLORS)) {
    if (line.includes(emoji)) return color;
  }
  return '#6366f1';
}

function formatChatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  if (!text.includes('#') && !text.includes('- ') && !text.includes('* ')) {
    return <span className="whitespace-pre-line">{text}</span>;
  }

  const lines = text.split('\n');
  const rendered: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        rendered.push(
          <pre key={`code-${idx}`} className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-[11px] text-emerald-400 overflow-x-auto my-2">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('# ') || line.startsWith('## ')) {
      const clean = line.replace(/^#+\s*/, '');
      rendered.push(
        <h4 key={idx} className="text-body font-bold text-text mt-4 mb-1.5 border-b border-border pb-0.5">
          {clean}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      const label = line.slice(4).trim();
      const accent = sectionAccent(label);
      rendered.push(
        <div key={idx} className="flex items-center gap-2 mt-4 mb-1.5">
          <span
            className="inline-block w-1 h-5 rounded-full flex-shrink-0"
            style={{ background: accent }}
          />
          <h5 className="text-body-sm font-bold" style={{ color: accent }}>
            {label}
          </h5>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '');
      const num = line.match(/^(\d+)/)?.[1];
      rendered.push(
        <div key={idx} className="flex items-start gap-2 my-0.5 ml-2">
          <span className="text-caption font-bold text-primary-500 w-4 flex-shrink-0 mt-0.5">{num}.</span>
          <p className="text-body-sm text-text-muted leading-relaxed">{content}</p>
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      rendered.push(
        <div key={idx} className="flex items-start gap-2 my-0.5 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0 mt-1.5" />
          <p className="text-body-sm text-text-muted leading-relaxed">{line.slice(2)}</p>
        </div>
      );
    } else if (line.trim() === '') {
      // whitespace gap — rely on spacing utilities
    } else {
      // inline bold support
      const parts = line.split(/\*\*/);
      if (parts.length > 1) {
        rendered.push(
          <p key={idx} className="text-body-sm text-text-muted leading-relaxed my-0.5">
            {parts.map((part, i) =>
              i % 2 === 1
                ? <strong key={i} className="font-semibold text-text">{part}</strong>
                : <span key={i}>{part}</span>
            )}
          </p>
        );
      } else {
        rendered.push(
          <p key={idx} className="text-body-sm text-text-muted leading-relaxed my-0.5">{line}</p>
        );
      }
    }
  }

  return <div className="space-y-1">{rendered}</div>;
}

export default function AICTOPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionSeeded, setSessionSeeded] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  // Dynamic suggested questions derived from the scan
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  const sessionId = id || 'default-session';

  /** Rotate through the full question pool to show a fresh set of 6 */
  const handleShuffleQuestions = useCallback(() => {
    setAllQuestions(prev => {
      const shuffled = shuffleArray(prev);
      setSuggestedQuestions(shuffled.slice(0, 6));
      return shuffled;
    });
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      const parsed = JSON.parse(localScanData);
      setScanResult(parsed);

      // Generate dynamic suggested questions from the real scan data
      const generated = generateSuggestedQuestions(parsed);
      setAllQuestions(generated);
      setSuggestedQuestions(generated.slice(0, 6));

      const criticalCount = (parsed?.security_findings || []).filter((f: any) => f.severity === 'critical').length;
      const highCount     = (parsed?.security_findings || []).filter((f: any) => f.severity === 'high').length;
      const framework     = parsed?.repositoryProfile?.framework?.value || parsed?.repositoryProfile?.framework || 'your stack';
      const hasTests      = parsed?.repositoryProfile?.hasTests;

      const urgencyLine = criticalCount > 0
        ? `I found **${criticalCount} critical** and **${highCount} high**-severity security issues that need attention before any deployment.`
        : highCount > 0
          ? `No critical vulnerabilities, but I did flag **${highCount} high-severity issues** worth addressing soon.`
          : 'The security surface looks clean — no critical or high-severity issues detected.';

      const testLine = hasTests
        ? 'Test suites are present, which is a strong signal for deployment confidence.'
        : '**No automated tests were detected** — this is the biggest risk to long-term stability.';

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `I've completed my review of your **${framework}** repository.

${urgencyLine}

${testLine}

Ask me anything — architecture decisions, deployment readiness, what to fix first, or how to improve your security posture. I'll give you a straight answer.`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim() || !scanResult) return;

    if (!textToSend) setInput('');

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

      // On the first message of a session, seed the server with scanResult.
      // On all subsequent messages the server already has the cached context.
      const payload: Record<string, any> = {
        message: text,
        sessionId,
      };
      if (!sessionSeeded) {
        payload.scanResult = scanResult;
      }

      const { data } = await axios.post(`${apiBaseUrl}/api/ai/chat`, payload);

      // Mark session as seeded after first successful response
      if (!sessionSeeded) setSessionSeeded(true);
      if (data.historyLength != null) setExchangeCount(data.historyLength);

      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'No response returned from AI CTO.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      error('Failed to send message', e instanceof Error ? e.message : String(e));
      console.error(e);
    } finally {
      setTyping(false);
    }
  };

  /** Clears server session memory and resets the local chat UI. */
  const handleResetChat = async () => {
    if (typing) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      await axios.post(`${apiBaseUrl}/api/ai/session/clear`, { sessionId });
    } catch (_) {
      // Silent — local reset still proceeds even if the server call fails
    }
    setSessionSeeded(false);
    setExchangeCount(0);

    // Rebuild the welcome message
    const criticalCount = (scanResult?.security_findings || []).filter((f: any) => f.severity === 'critical').length;
    const highCount = (scanResult?.security_findings || []).filter((f: any) => f.severity === 'high').length;
    const framework = scanResult?.repositoryProfile?.framework?.value || scanResult?.repositoryProfile?.framework || 'your stack';
    const hasTests = scanResult?.repositoryProfile?.hasTests;
    const urgencyLine = criticalCount > 0
      ? `I found **${criticalCount} critical** and **${highCount} high**-severity security issues that need attention before any deployment.`
      : highCount > 0
        ? `No critical vulnerabilities, but I did flag **${highCount} high-severity issues** worth addressing soon.`
        : 'The security surface looks clean — no critical or high-severity issues detected.';
    const testLine = hasTests
      ? 'Test suites are present, which is a strong signal for deployment confidence.'
      : '**No automated tests were detected** — this is the biggest risk to long-term stability.';

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat reset. I've kept my full analysis of your **${framework}** repository — just the conversation history was cleared.

${urgencyLine}

${testLine}

What would you like to dive into?`,
        timestamp: new Date().toISOString(),
      },
    ]);
    success('Chat Reset', 'Conversation history cleared. Repository analysis is still cached.');
  };


  const handleGenerateReport = async () => {
    if (!scanResult || typing) return;
    setTyping(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const { data } = await axios.post(`${apiBaseUrl}/api/ai/review`, { scanResult });
      if (data?.review) {
        const reportMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.review,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, reportMessage]);
        success('CTO Report Generated', 'The full architectural audit report has been added to your chat consultation.');
      }
    } catch (e: any) {
      error('Failed to generate report', e.message || String(e));
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)]">
      {/* Chat pane */}
      <div className="flex-1 card flex flex-col overflow-hidden min-h-[400px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-body-sm font-semibold text-text">AI CTO Advisor</h3>
              <span className="text-[10px] text-text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {sessionSeeded
                  ? `Session active · ${exchangeCount} exchange${exchangeCount !== 1 ? 's' : ''} remembered`
                  : 'Repository scan loaded · Send a message to start'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              disabled={typing || messages.length <= 1}
              title="Reset conversation history"
              className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-card border border-transparent hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateReport}
              disabled={typing || !scanResult}
              leftIcon={<Sparkles size={14} className="text-amber-500 animate-pulse" />}
            >
              Generate Full CTO Report
            </Button>
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-body-sm text-text-muted">Loading consultation history…</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-secondary-200 text-secondary-800' : 'bg-primary-100 text-primary-700'}`}>
                    {isUser ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`rounded-2xl p-4 text-body-sm leading-relaxed border ${
                    isUser
                      ? 'bg-primary-500 text-white border-primary-600 rounded-tr-sm shadow-sm'
                      : 'bg-bg-card text-text border-border rounded-tl-sm'
                  }`}>
                    {isUser ? msg.content : formatChatMarkdown(msg.content)}
                  </div>
                </motion.div>
              );
            })
          )}

          {typing && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
                <Bot size={14} />
              </div>
              <div className="rounded-2xl p-4 bg-bg-card text-text border border-border rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay }}
                      className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested Questions */}
        <div className="border-t border-border bg-bg-subtle/40">
          <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={10} className="text-primary-400" />
              Suggested for this repository
            </span>
            <button
              onClick={handleShuffleQuestions}
              title="Show different suggestions"
              className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-card transition-all"
            >
              <Shuffle size={11} />
            </button>
          </div>
          <div className="px-4 pb-2.5 grid grid-cols-2 gap-1.5">
            {suggestedQuestions.map((q, i) => (
              <motion.button
                key={q}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => handleSend(q)}
                disabled={typing}
                title={q}
                className="text-left px-3 py-2 rounded-lg border border-border bg-bg-card text-[11px] text-text-muted hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all line-clamp-2 leading-snug disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border bg-bg-card flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask your AI CTO anything about your project..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-bg-subtle text-body-sm text-text placeholder:text-text-subtle focus:ring-2 focus:ring-primary-500 focus:border-primary-400 outline-none transition-all"
          />
          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            leftIcon={<Send size={14} />}
          >
            Send
          </Button>
        </div>
      </div>

      {/* Right insights bar */}
      <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
        <InformationCard
          title="CTO Directives"
          description={`Your Launch Score is currently ${scanResult?.launch_score?.overall ?? 0}/100. ${(scanResult?.security_findings || []).filter((f: any) => f.severity === 'critical').length > 0 ? `Let's fix the ${(scanResult?.security_findings || []).filter((f: any) => f.severity === 'critical').length} critical security issues detected in your repository before production deployment.` : 'No critical security issues were detected in your repository.'}`}
          variant="warning"
          icon={<ShieldAlert className="text-amber-500" size={18} />}
        />

        <InformationCard
          title="System Constraints"
          description="Autoscaling parameters, memory/CPU limits, and cache connection variables are Not Detected in the repository files."
          variant="info"
          icon={<Cpu className="text-blue-500" size={18} />}
        />

        <div className="card p-6 space-y-4">
          <h4 className="text-body-sm font-semibold text-text flex items-center gap-1.5">
            <Lightbulb size={16} className="text-primary-500" />
            Quick Recommendation
          </h4>
          <p className="text-caption text-text-muted">
            Review the static security findings or click 'One-Click Fixes' in the sidebar to generate AI remediations for the detected findings.
          </p>
        </div>
      </div>
    </div>
  );
}
