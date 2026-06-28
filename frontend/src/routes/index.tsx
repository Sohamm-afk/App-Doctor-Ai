import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppShell }     from '@/layouts/AppShell';
import { PublicLayout } from '@/layouts/PublicLayout';
import { PageLoading }  from '@/components/ui/Loading';

// ─── Lazy imports ─────────────────────────────────────────────────

const Landing          = lazy(() => import('@/pages/Landing'));
const Login            = lazy(() => import('@/pages/Login'));
const Register         = lazy(() => import('@/pages/Register'));
const Workspace        = lazy(() => import('@/pages/Workspace'));
const Upload           = lazy(() => import('@/pages/Upload'));
const Scanning         = lazy(() => import('@/pages/Scanning'));
const NotFound         = lazy(() => import('@/pages/NotFound'));

// Project pages
const Overview         = lazy(() => import('@/pages/project/Overview'));
const Security         = lazy(() => import('@/pages/project/Security'));
const ArchitecturePage = lazy(() => import('@/pages/project/Architecture'));
const PerformancePage  = lazy(() => import('@/pages/project/Performance'));
const CloudPage        = lazy(() => import('@/pages/project/Cloud'));
const ScalabilityPage  = lazy(() => import('@/pages/project/Scalability'));
const TechnicalDebtPage = lazy(() => import('@/pages/project/TechnicalDebt'));
const AICTOPage        = lazy(() => import('@/pages/project/AICTO'));
const FixesPage        = lazy(() => import('@/pages/project/Fixes'));
const ReportsPage      = lazy(() => import('@/pages/project/Reports'));
const SettingsPage     = lazy(() => import('@/pages/project/Settings'));

// ─── Suspense wrapper ─────────────────────────────────────────────

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

// ─── Router ───────────────────────────────────────────────────────

const router = createBrowserRouter([
  // ── Public ──
  {
    element: <PublicLayout />,
    children: [
      { path: '/',         element: <Page><Landing  /></Page> },
      { path: '/login',    element: <Navigate to="/workspace" replace /> },
      { path: '/register', element: <Navigate to="/workspace" replace /> },
    ],
  },

  // ── Authenticated / Shell ──
  {
    element: <AppShell />,
    children: [
      { path: '/workspace',          element: <Page><Workspace /></Page> },
      { path: '/workspace/upload',   element: <Page><Upload    /></Page> },
      { path: '/workspace/scanning', element: <Page><Scanning  /></Page> },

      {
        path: '/workspace/project/:id',
        children: [
          { index: true,        element: <Navigate to="overview" replace /> },
          { path: 'overview',      element: <Page><Overview          /></Page> },
          { path: 'architecture',  element: <Page><ArchitecturePage  /></Page> },
          { path: 'security',      element: <Page><Security          /></Page> },
          { path: 'performance',   element: <Page><PerformancePage   /></Page> },
          { path: 'cloud',         element: <Page><CloudPage         /></Page> },
          { path: 'scalability',   element: <Page><ScalabilityPage   /></Page> },
          { path: 'technical-debt',element: <Page><TechnicalDebtPage /></Page> },
          { path: 'ai-cto',        element: <Page><AICTOPage         /></Page> },
          { path: 'fixes',         element: <Page><FixesPage         /></Page> },
          { path: 'reports',       element: <Page><ReportsPage       /></Page> },
          { path: 'settings',      element: <Page><SettingsPage      /></Page> },
        ],
      },
    ],
  },

  // ── 404 ──
  { path: '*', element: <Page><NotFound /></Page> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
