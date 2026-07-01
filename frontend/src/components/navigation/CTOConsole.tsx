import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/utils';
import type { ChatMessage } from '@/types';

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I am your AI CTO. Ask me anything about your scanned repository architecture, security, or deployment configs.",
    timestamp: new Date().toISOString()
  }
];

const DEFAULT_SUGGESTED_PROMPTS = [
  "How can I improve the security score?",
  "What backend framework was detected?",
  "How should I containerize the app?"
];

// ─── Message bubble ───────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-secondary-200' : 'bg-primary-100',
      )}>
        {isUser ? (
          <span className="text-[10px] font-bold text-secondary-700">U</span>
        ) : (
          <Bot size={12} className="text-primary-600" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'max-w-[85%] text-caption leading-relaxed rounded-xl px-3 py-2',
        isUser
          ? 'bg-primary-500 text-white rounded-tr-sm'
          : 'bg-bg-card border border-border text-text rounded-tl-sm',
      )}>
        {msg.content}
      </div>
    </motion.div>
  );
}

// ─── CTO Console ──────────────────────────────────────────────────

const CONSOLE_COLLAPSED_HEIGHT = 44;
const CONSOLE_EXPANDED_HEIGHT  = 320;

export function CTOConsole() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, expanded]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'This is a mock AI CTO response. When connected to the backend, I will analyze your codebase and provide detailed insights.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handlePrompt = (prompt: string) => {
    setInput(prompt);
    if (!expanded) setExpanded(true);
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-[45] bg-bg-card border-t border-border shadow-lg"
      animate={{ height: expanded ? CONSOLE_EXPANDED_HEIGHT : CONSOLE_COLLAPSED_HEIGHT }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{ marginLeft: 0 }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 h-11 cursor-pointer select-none border-b border-border"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
        aria-label="Toggle AI CTO Console"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center">
            <Bot size={13} className="text-white" />
          </div>
          <span className="text-body-sm font-semibold text-text">AI CTO Console</span>
          {isTyping && (
            <div className="flex gap-0.5">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, delay, repeat: Infinity }}
                />
              ))}
            </div>
          )}
          {!expanded && (
            <span className="hidden sm:block text-caption text-text-muted ml-2 line-clamp-1">
              {messages[messages.length - 1]?.content.slice(0, 60)}…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary-400" />
          {expanded ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronUp size={16} className="text-text-muted" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col"
            style={{ height: CONSOLE_EXPANDED_HEIGHT - CONSOLE_COLLAPSED_HEIGHT }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isTyping && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <Bot size={12} className="text-primary-600" />
                  </div>
                  <div className="bg-bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, delay, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {DEFAULT_SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePrompt(prompt)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full border border-border bg-bg-subtle text-caption text-text-muted hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 pb-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask your AI CTO anything…"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-subtle text-body-sm text-text placeholder:text-text-subtle outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition-all"
                aria-label="AI CTO chat input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-lg bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
