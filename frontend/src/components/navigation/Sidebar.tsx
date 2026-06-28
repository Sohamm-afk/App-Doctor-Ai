import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GitBranch, Shield, Zap, Cloud, TrendingUp,
  AlertTriangle, Bot, Wrench, FileText, Settings, ChevronLeft,
  ChevronRight, Upload, BarChart3,
} from 'lucide-react';
import { cn } from '@/utils';
import { Badge } from '@/components/ui/Badge';
import { SIDEBAR_ITEMS } from '@/constants';

// ─── Icon map ─────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  GitBranch:       <GitBranch       size={18} />,
  Shield:          <Shield          size={18} />,
  Zap:             <Zap             size={18} />,
  Cloud:           <Cloud           size={18} />,
  TrendingUp:      <TrendingUp      size={18} />,
  AlertTriangle:   <AlertTriangle   size={18} />,
  Bot:             <Bot             size={18} />,
  Wrench:          <Wrench          size={18} />,
  FileText:        <FileText        size={18} />,
  Settings:        <Settings        size={18} />,
};

// ─── Sidebar ──────────────────────────────────────────────────────

interface SidebarProps {
  /** Mobile: if true, sidebar is open as a drawer */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { id: projectId } = useParams<{ id: string }>();

  // Close sidebar on mobile route change
  useEffect(() => {
    onMobileClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 z-sidebar lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed left-0 top-[60px] bottom-0 z-sidebar',
          'bg-white border-r border-border flex flex-col',
          'overflow-hidden transition-shadow',
          // Mobile: full slide
          'max-lg:translate-x-0',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          'lg:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 no-scrollbar">
          {/* Upload CTA */}
          {!collapsed && (
            <NavLink
              to="/workspace/upload"
              className="mx-3 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-body-sm font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
            >
              <Upload size={16} />
              <span>Upload Repository</span>
            </NavLink>
          )}

          {SIDEBAR_ITEMS.map((item) => {
            const resolvedPath = projectId ? item.route(projectId) : '#';
            const isDisabled   = !projectId;
            const icon         = ICON_MAP[item.icon];

            return (
              <div key={item.key}>
                {!isDisabled ? (
                  <NavLink
                    to={resolvedPath}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'sidebar-item mx-2',
                        isActive && 'active',
                        collapsed && 'justify-center px-0 w-10 mx-auto',
                      )
                    }
                    aria-label={item.label}
                  >
                    <span className="sidebar-icon flex-shrink-0">{icon}</span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.badge && (
                      <Badge variant={item.badge === 'new' ? 'new' : 'beta'} size="xs">
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                ) : (
                  <div
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'sidebar-item mx-2 opacity-40 cursor-not-allowed',
                      collapsed && 'justify-center px-0 w-10 mx-auto',
                    )}
                    aria-disabled="true"
                  >
                    <span className="flex-shrink-0">{icon}</span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </div>
                )}

                {item.dividerAfter && !collapsed && (
                  <hr className="my-2 mx-3 border-border" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text transition-colors text-body-sm',
              collapsed && 'justify-center',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
