import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar }     from '@/components/navigation/Navbar';
import { Sidebar }    from '@/components/navigation/Sidebar';
import { CTOConsole } from '@/components/navigation/CTOConsole';
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
//  ┌─────────────── CTO Console (fixed bottom, collapsible) ───────┐
//  └───────────────────────────────────────────────────────────────┘

const SIDEBAR_WIDTH           = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const NAVBAR_HEIGHT           = 60;
const CONSOLE_HEIGHT          = 44; // collapsed height

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          paddingBottom: CONSOLE_HEIGHT + 24,
        }}
        id="main-content"
        role="main"
        aria-label="Main content"
      >
        <div className="w-full max-w-content mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </div>
      </motion.main>

      {/* ── CTO Console ── */}
      <CTOConsole />
    </div>
  );
}
