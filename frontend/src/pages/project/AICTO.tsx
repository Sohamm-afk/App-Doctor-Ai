import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, User, Lightbulb, ShieldAlert, Cpu } from 'lucide-react';
import { mockService, MOCK_SUGGESTED_PROMPTS } from '@/services/mock';
import { Button } from '@/components/ui/Button';
import { InformationCard } from '@/components/cards/Cards';
import type { ChatMessage } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function AICTOPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    mockService.getChatSession(id).then((session) => {
      setMessages(session.messages);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim()) return;

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
      const response = await mockService.sendChatMessage('session-001', text);
      setMessages((prev) => [...prev, response]);
    } catch (e) {
      console.error(e);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)]">
      {/* Chat pane */}
      <div className="flex-1 card flex flex-col overflow-hidden min-h-[400px]">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-bg-subtle">
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
                      : 'bg-white text-text border-border rounded-tl-sm'
                  }`}>
                    {msg.content}
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
              <div className="rounded-2xl p-4 bg-white text-text border border-border rounded-tl-sm">
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
          {MOCK_SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 px-3 py-1 rounded-full border border-border bg-white text-caption text-text-muted hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border bg-white flex gap-2">
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
          description="Your Launch Score is currently 74/100. Let's fix the 2 critical SQL Injection vulnerabilities in search handlers before production deployment."
          variant="warning"
          icon={<ShieldAlert className="text-amber-500" size={18} />}
        />

        <InformationCard
          title="System Constraints"
          description="Throughput metrics show a minor latency spike during payment gateway connections. Enable Redis caching for high load operations."
          variant="info"
          icon={<Cpu className="text-blue-500" size={18} />}
        />

        <div className="card p-6 space-y-4">
          <h4 className="text-body-sm font-semibold text-text flex items-center gap-1.5">
            <Lightbulb size={16} className="text-primary-500" />
            Quick Recommendation
          </h4>
          <p className="text-caption text-text-muted">
            Run the <code>fixes</code> directive or click 'One-Click Fixes' in the sidebar to review the automated pull request code patches.
          </p>
        </div>
      </div>
    </div>
  );
}
