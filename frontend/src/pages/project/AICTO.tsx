import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, User, Lightbulb, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { InformationCard } from '@/components/cards/Cards';
import { useToast } from '@/components/ui/Toast';
import type { ChatMessage } from '@/types';

const SUGGESTED_PROMPTS = [
  "Why is my launch score low?",
  "Is this production ready?",
  "Show my biggest security risks.",
  "How can I improve architecture?",
  "What should I fix first?",
  "Explain my launch score."
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

function formatChatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  if (!text.includes('#')) {
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
      rendered.push(<h4 key={idx} className="text-body font-bold text-text mt-4 mb-1.5 border-b border-border pb-0.5">{clean}</h4>);
    } else if (line.startsWith('### ')) {
      rendered.push(<h5 key={idx} className="text-body-sm font-semibold text-text mt-3 mb-1">{line.slice(4)}</h5>);
    } else if (line.startsWith('- ')) {
      rendered.push(<li key={idx} className="text-body-sm text-text-muted ml-4 list-disc pl-1 my-0.5">{line.slice(2)}</li>);
    } else if (line.startsWith('* ')) {
      rendered.push(<li key={idx} className="text-body-sm text-text-muted ml-4 list-disc pl-1 my-0.5">{line.slice(2)}</li>);
    } else if (line.trim() === '') {
      // rely on container layout
    } else {
      rendered.push(<p key={idx} className="text-body-sm text-text-muted leading-relaxed my-1">{line}</p>);
    }
  }

  return <div className="space-y-2">{rendered}</div>;
}

export default function AICTOPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (localScanData) {
      const parsed = JSON.parse(localScanData);
      setScanResult(parsed);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I've finished reviewing your repository.\n\nOverall, your project has a solid foundation. I found several strengths as well as a few areas that should be improved before production.\n\nI'm ready to answer any questions about your architecture, security, performance, scalability or deployment.\n\nWhat would you like to know?",
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

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setTyping(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const { data } = await axios.post(`${apiBaseUrl}/api/ai/chat`, {
        message: text,
        history: newMessages.map(m => ({ role: m.role, content: m.content })),
        scanResult
      });

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
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-body-sm font-semibold text-text">AI CTO Consulting</h3>
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active in sandbox
              </span>
            </div>
          </div>
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

        {/* Suggested Prompts */}
        <div className="px-6 py-2.5 bg-bg-subtle/50 border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-text-muted font-semibold uppercase flex-shrink-0">Suggested:</span>
          {SUGGESTED_PROMPTS.map((prompt: string) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 px-3 py-1 rounded-full border border-border bg-bg-card text-caption text-text-muted hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              {prompt}
            </button>
          ))}
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
