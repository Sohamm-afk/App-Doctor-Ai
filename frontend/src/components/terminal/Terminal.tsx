import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, X, Minus, Maximize2 } from 'lucide-react';
import { cn } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────

export type TerminalLineType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'muted' | 'command';

export interface TerminalLine {
  id:      string;
  type:    TerminalLineType;
  content: string;
  prefix?: string;
}

interface TerminalProps {
  lines?:     TerminalLine[];
  title?:     string;
  loading?:   boolean;
  className?: string;
  /** If true, auto-scrolls to bottom when lines change */
  autoScroll?: boolean;
  showControls?: boolean;
}

// ─── Line prefix symbols ──────────────────────────────────────────

const prefixSymbols: Record<TerminalLineType, string> = {
  default: '  ',
  success: '✓ ',
  error:   '✗ ',
  warning: '⚠ ',
  info:    'ℹ ',
  muted:   '  ',
  command: '$ ',
};

const lineColors: Record<TerminalLineType, string> = {
  default: 'text-gray-300',
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
  muted:   'text-gray-600',
  command: 'text-white font-medium',
};

// ─── Terminal Component ───────────────────────────────────────────

export function Terminal({
  lines = [],
  title = 'AppDoctor AI Scan',
  loading = false,
  className,
  autoScroll = true,
  showControls = true,
}: TerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  return (
    <div
      className={cn(
        'bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-lg',
        className,
      )}
      role="log"
      aria-label="Terminal output"
      aria-live="polite"
    >
      {/* Header */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {/* Traffic light dots */}
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-amber-400 opacity-80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-80" />
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <TerminalIcon size={12} />
            <span className="text-caption">{title}</span>
          </div>
          <div className="flex gap-2 text-gray-600">
            <Minus size={14} className="cursor-pointer hover:text-gray-400 transition-colors" />
            <Maximize2 size={14} className="cursor-pointer hover:text-gray-400 transition-colors" />
            <X size={14} className="cursor-pointer hover:text-gray-400 transition-colors" />
          </div>
        </div>
      )}

      {/* Lines */}
      <div className="p-4 font-mono text-caption space-y-0.5 min-h-[200px] max-h-[400px] overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
              className={cn('flex items-start gap-1 leading-relaxed', lineColors[line.type])}
            >
              <span className="opacity-60 flex-shrink-0 select-none">
                {line.prefix ?? prefixSymbols[line.type]}
              </span>
              <span className="break-all">{line.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading cursor */}
        {loading && (
          <motion.div
            className="flex items-center gap-2 text-gray-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="opacity-60">  </span>
            <span className="w-2 h-4 bg-primary-500 inline-block" />
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Terminal Demo (mock scanning animation) ──────────────────────

const DEMO_LINES: TerminalLine[] = [
  { id: '1', type: 'command', content: 'appdoctor scan --repo https://github.com/acme/ecommerce' },
  { id: '2', type: 'info',    content: 'Cloning repository...' },
  { id: '3', type: 'success', content: 'Repository cloned successfully (2.3s)' },
  { id: '4', type: 'info',    content: 'Running security analysis...' },
  { id: '5', type: 'warning', content: 'Found 2 critical vulnerabilities' },
  { id: '6', type: 'info',    content: 'Analyzing performance bottlenecks...' },
  { id: '7', type: 'success', content: 'Performance analysis complete' },
  { id: '8', type: 'info',    content: 'Estimating cloud costs...' },
  { id: '9', type: 'success', content: 'Cloud cost estimation complete ($1,847/mo)' },
  { id: '10', type: 'info',   content: 'Mapping architecture...' },
  { id: '11', type: 'success', content: 'Architecture mapped — 10 nodes, 10 edges' },
  { id: '12', type: 'info',   content: 'Calculating launch score...' },
  { id: '13', type: 'success', content: 'Launch Score: 74/100 — Launch with caution' },
  { id: '14', type: 'default', content: '' },
  { id: '15', type: 'info',   content: 'Scan complete in 42.1s. View full report →' },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < DEMO_LINES.length) {
        setVisibleLines((prev) => [...prev, DEMO_LINES[i]]);
        i++;
      } else {
        setLoading(false);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return <Terminal lines={visibleLines} loading={loading} title="AppDoctor AI — Scanning" />;
}
