import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/utils';
import { Badge } from '@/components/ui/Badge';

// ─── Code Block ───────────────────────────────────────────────────

interface CodeBlockProps {
  code:        string;
  language?:   string;
  showLineNumbers?: boolean;
  title?:      string;
  className?:  string;
  maxHeight?:  string;
}

export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = true,
  title,
  className,
  maxHeight = '400px',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className={cn('bg-gray-950 rounded-xl overflow-hidden border border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {title && <span className="text-caption text-gray-400">{title}</span>}
          <Badge variant="neutral" size="xs" className="bg-gray-800 text-gray-400 border-gray-700 font-mono">
            {language}
          </Badge>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 text-caption px-2 py-1 rounded transition-all duration-150',
            copied
              ? 'text-emerald-400 bg-emerald-900/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
          )}
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code area */}
      <div
        className="overflow-auto no-scrollbar"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group">
                {showLineNumbers && (
                  <td className="select-none text-right pr-4 pl-4 py-0.5 text-caption text-gray-600 font-mono w-10 border-r border-gray-800 group-hover:text-gray-500 transition-colors">
                    {i + 1}
                  </td>
                )}
                <td className="px-4 py-0.5 text-caption font-mono text-gray-300 whitespace-pre group-hover:bg-gray-900/50 transition-colors">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Diff Viewer ──────────────────────────────────────────────────

type DiffLineType = 'added' | 'removed' | 'context' | 'header';

interface DiffLine {
  type:    DiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffViewerProps {
  diff:        string | DiffLine[];
  title?:      string;
  language?:   string;
  className?:  string;
  maxHeight?:  string;
}

function parseDiff(rawDiff: string): DiffLine[] {
  return rawDiff.split('\n').map((line) => {
    if (line.startsWith('@@'))  return { type: 'header',  content: line };
    if (line.startsWith('+'))   return { type: 'added',   content: line.slice(1) };
    if (line.startsWith('-'))   return { type: 'removed', content: line.slice(1) };
    return                             { type: 'context', content: line };
  });
}

const diffLineStyles: Record<DiffLineType, string> = {
  added:   'bg-emerald-900/30 text-emerald-300 border-l-2 border-emerald-500',
  removed: 'bg-red-900/30     text-red-300     border-l-2 border-red-500',
  context: 'text-gray-400',
  header:  'text-blue-400 bg-blue-900/20 font-medium py-1',
};

const diffPrefixes: Record<DiffLineType, string> = {
  added:   '+',
  removed: '-',
  context: ' ',
  header:  '',
};

export function DiffViewer({
  diff,
  title,
  language = 'text',
  className,
  maxHeight = '500px',
}: DiffViewerProps) {
  const lines: DiffLine[] = typeof diff === 'string' ? parseDiff(diff) : diff;

  return (
    <div className={cn('bg-gray-950 rounded-xl overflow-hidden border border-gray-800', className)}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
          <span className="text-caption text-gray-400">{title}</span>
          <Badge variant="neutral" size="xs" className="bg-gray-800 text-gray-400 border-gray-700 font-mono">
            {language}
          </Badge>
        </div>
      )}

      {/* Diff content */}
      <div className="overflow-auto no-scrollbar font-mono text-caption" style={{ maxHeight }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start px-4 py-0.5 leading-relaxed',
              diffLineStyles[line.type],
            )}
          >
            <span className="select-none w-4 flex-shrink-0 opacity-60">
              {diffPrefixes[line.type]}
            </span>
            <span className="whitespace-pre flex-1">{line.content || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline Code ──────────────────────────────────────────────────

export function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn(
      'px-1.5 py-0.5 rounded text-caption font-mono bg-secondary-100 text-secondary-700 border border-secondary-200',
      className,
    )}>
      {children}
    </code>
  );
}
