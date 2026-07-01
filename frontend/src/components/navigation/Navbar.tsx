import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Bell, Settings, User, ChevronDown,
  Rocket, Menu, Command, Zap,
} from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CommandPalette, SearchBar } from '@/components/common/CommandPalette';
import { mockService } from '@/services/mock';
import type { Project } from '@/types';
import { ThemeToggle } from '@/components/common/ThemeToggle';

// ─── Logo ─────────────────────────────────────────────────────────

function AppLogo() {
  return (
    <Link to="/workspace" className="flex items-center gap-2.5 group" aria-label="AppDoctor AI home">
      <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-sm group-hover:bg-primary-600 transition-colors">
        <Zap size={16} className="text-white" />
      </div>
      <span className="font-heading font-bold text-h4 text-text group-hover:text-primary-600 transition-colors">
        AppDoctor <span className="text-primary-500">AI</span>
      </span>
    </Link>
  );
}

// ─── Project Selector ─────────────────────────────────────────────

function ProjectSelector() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    mockService.getProjects().then(setProjects);
  }, [id, open]);

  const project = projects.find((p) => p.id === id);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-white',
          'text-body-sm font-medium text-text hover:bg-bg-subtle transition-colors',
          'max-w-[200px]',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
        <span className="truncate flex-1">{project?.name ?? 'Select project'}</span>
        <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-xl shadow-dropdown z-dropdown py-1 overflow-hidden">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/workspace/project/${p.id}/overview`}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 hover:bg-bg-subtle transition-colors',
                  p.id === id && 'bg-primary-50',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', p.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text truncate">{p.name}</p>
                  <p className="text-caption text-text-muted">{p.framework}</p>
                </div>
                <span className={cn(
                  'text-caption font-bold flex-shrink-0',
                  p.launchScore >= 80 ? 'text-emerald-600' : p.launchScore >= 60 ? 'text-amber-500' : 'text-red-500',
                )}>
                  {p.launchScore}
                </span>
              </Link>
            ))}
            <hr className="my-1 border-border" />
            <Link
              to="/workspace/upload"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-primary-600 font-medium hover:bg-primary-50 transition-colors"
            >
              + Add new project
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notification Button ──────────────────────────────────────────

function NotificationButton() {
  return (
    <button
      className="relative w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
      aria-label="Notifications"
    >
      <Bell size={18} />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
    </button>
  );
}


// ─── Navbar ───────────────────────────────────────────────────────

interface NavbarProps {
  onMobileMenuToggle: () => void;
}

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { id: projectId } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    mockService.getProjects().then(setProjects);
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 h-[60px] glass-nav border-b border-border z-navbar flex items-center px-4 gap-3"
        role="banner"
      >
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden w-8 h-8 flex items-center justify-center text-text-muted hover:text-text rounded-lg hover:bg-bg-subtle transition-colors"
          onClick={onMobileMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <AppLogo />

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Project selector */}
        <div className="hidden sm:block">
          <ProjectSelector />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search (desktop) */}
        <div className="hidden md:block w-56">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search… ⌘K"
            onCmdK={() => setCmdOpen(true)}
            className="w-full"
          />
        </div>

        {/* Launch score badge */}
        {projectId && project && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-caption font-semibold text-amber-700">Score: {project.launchScore}</span>
          </motion.div>
        )}

        {/* Can I Deploy button */}
        {projectId && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Rocket size={14} />}
            className="hidden sm:flex"
          >
            Can I Deploy?
          </Button>
        )}

        {/* Cmd palette shortcut */}
        <button
          onClick={() => setCmdOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle hover:text-text transition-colors md:hidden"
          aria-label="Open command palette"
        >
          <Command size={18} />
        </button>

        {/* Notifications */}
        <NotificationButton />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Settings */}
        <Link
          to={projectId ? `/workspace/project/${projectId}/settings` : '/workspace'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </Link>

      </header>

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        projectId={projectId}
      />
    </>
  );
}
