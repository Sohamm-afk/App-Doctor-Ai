import { Outlet, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

// ─── Public Layout ────────────────────────────────────────────────
// Used for landing, login, register pages — no sidebar or console

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-navbar h-[60px] glass-nav border-b border-border flex items-center px-6">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="AppDoctor AI">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center group-hover:bg-primary-600 transition-colors">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-heading font-bold text-h4 text-text">
            AppDoctor <span className="text-primary-500">AI</span>
          </span>
        </Link>
        <div className="flex-1" />
        <ThemeToggle />
      </header>

      {/* Page content */}
      <main className="flex-1 pt-[60px]" role="main">
        <Outlet />
      </main>
    </div>
  );
}
