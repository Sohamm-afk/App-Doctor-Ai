import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar }     from '@/components/navigation/Navbar';
import { Sidebar }    from '@/components/navigation/Sidebar';
import { cn } from '@/utils';

// ─── App Shell ────────────────────────────────────────────────────
//
//  ┌─────────────────── Navbar (fixed, 60px) ──────────────────────┐
//  │ Logo │ ProjectSelector │ Search │ Score │ Deploy │ Notif │ User│
//  └───────────────────────────────────────────────────────────────┘
//  ┌─── Sidebar ───┐ ┌──────── Main Content ─────────────────────┐
//  │ Overview      │ │                                             │
//  │ Architecture  │ │  <Outlet />                                 │
//  │ Security      │ │                                             │
//  │ ...           │ │                                             │
//  └───────────────┘ └─────────────────────────────────────────────┘
const SIDEBAR_WIDTH           = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const NAVBAR_HEIGHT           = 60;

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Navbar ── */}
      <Navbar onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)} />

      {/* ── Sidebar ── */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* ── Main workspace ── */}
      <motion.main
        className={cn(
          'min-h-screen',
          // Left offset for sidebar (desktop only)
          'lg:pl-[240px]',
        )}
        style={{
          paddingTop:    NAVBAR_HEIGHT,
        }}
        id="main-content"
        role="main"
        aria-label="Main content"
      >
        <div className="w-full max-w-content mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}
