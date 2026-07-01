import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, Shield, FileText, Bot, GitBranch, Upload, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';

// ─── Command Item ─────────────────────────────────────────────────

interface CommandItem {
  id:       string;
  label:    string;
  group:    string;
  icon:     React.ReactNode;
  shortcut?: string;
  action:   () => void;
}

// ─── Command Palette ──────────────────────────────────────────────

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
  projectId?: string;
}

export function CommandPalette({ open, onClose, projectId = 'proj-001' }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'security',
      label: 'Open Security',
      group: 'Navigation',
      icon: <Shield size={16} className="text-red-500" />,
      action: () => { navigate(`/workspace/project/${projectId}/security`); onClose(); },
    },
    {
      id: 'architecture',
      label: 'View Architecture',
      group: 'Navigation',
      icon: <GitBranch size={16} className="text-blue-500" />,
      action: () => { navigate(`/workspace/project/${projectId}/architecture`); onClose(); },
    },
    {
      id: 'ai-cto',
      label: 'Ask AI CTO',
      group: 'AI',
      icon: <Bot size={16} className="text-primary-500" />,
      action: () => { navigate(`/workspace/project/${projectId}/ai-cto`); onClose(); },
    },
    {
      id: 'upload',
      label: 'Upload Repository',
      group: 'Actions',
      icon: <Upload size={16} className="text-purple-500" />,
      action: () => { navigate('/workspace/upload'); onClose(); },
    },
    {
      id: 'report',
      label: 'Generate Report',
      group: 'Actions',
      icon: <FileText size={16} className="text-amber-500" />,
      action: () => { navigate(`/workspace/project/${projectId}/reports`); onClose(); },
    },
    {
      id: 'performance',
      label: 'View Performance',
      group: 'Navigation',
      icon: <Zap size={16} className="text-yellow-500" />,
      action: () => { navigate(`/workspace/project/${projectId}/performance`); onClose(); },
    },
  ];

  const filtered = query.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selected]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selected, onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  // Group items
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-bg-card rounded-2xl shadow-dialog overflow-hidden border border-border"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{    opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search size={18} className="text-text-subtle flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands…"
                className="flex-1 bg-transparent text-body-md text-text placeholder:text-text-subtle outline-none"
                aria-label="Command search"
                role="combobox"
                aria-expanded="true"
              />
              <div className="flex items-center gap-1 text-text-subtle border border-border rounded px-1.5 py-0.5">
                <Command size={10} />
                <span className="text-[10px]">K</span>
              </div>
            </div>

            {/* Commands */}
            <div className="max-h-[340px] overflow-y-auto py-2" role="listbox">
              {Object.entries(groups).length === 0 ? (
                <p className="text-center text-body-sm text-text-muted py-8">No commands found</p>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group} className="mb-1">
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-subtle">
                      {group}
                    </div>
                    {items.map((item, i) => {
                      const globalIdx = filtered.indexOf(item);
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={{ x: 2 }}
                          onClick={item.action}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIdx === selected
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-text hover:bg-bg-subtle',
                          )}
                          role="option"
                          aria-selected={globalIdx === selected}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          <span className="text-body-sm font-medium flex-1">{item.label}</span>
                          <ArrowRight size={14} className="opacity-30" />
                        </motion.button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-text-subtle text-caption">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>ESC close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────

interface SearchBarProps {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  onCmdK?:     () => void;
  className?:  string;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', onCmdK, className }: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={16} className="absolute left-3 text-text-subtle pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 pr-20 py-2 rounded-input border border-border bg-bg-card',
          'text-body-sm text-text placeholder:text-text-subtle',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400',
          'transition-all duration-150',
        )}
      />
      {onCmdK && (
        <button
          onClick={onCmdK}
          className="absolute right-2.5 flex items-center gap-0.5 text-text-subtle hover:text-text border border-border rounded px-1.5 py-0.5 transition-colors"
          aria-label="Open command palette"
        >
          <Command size={10} />
          <span className="text-[10px]">K</span>
        </button>
      )}
    </div>
  );
}
