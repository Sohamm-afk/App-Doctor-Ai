// ─── Application Routes ──────────────────────────────────────────

export const ROUTES = {
  // Public
  HOME:     '/',
  LOGIN:    '/login',
  REGISTER: '/register',

  // Workspace root
  WORKSPACE:        '/workspace',
  WORKSPACE_UPLOAD: '/workspace/upload',
  WORKSPACE_SCAN:   '/workspace/scanning',

  // Project sub-routes (use getProjectRoute helpers below)
  PROJECT_ROOT: (id: string) => `/workspace/project/${id}`,
  PROJECT_OVERVIEW:      (id: string) => `/workspace/project/${id}/overview`,
  PROJECT_ARCHITECTURE:  (id: string) => `/workspace/project/${id}/architecture`,
  PROJECT_SECURITY:      (id: string) => `/workspace/project/${id}/security`,
  PROJECT_PERFORMANCE:   (id: string) => `/workspace/project/${id}/performance`,
  PROJECT_CLOUD:         (id: string) => `/workspace/project/${id}/cloud`,
  PROJECT_SCALABILITY:   (id: string) => `/workspace/project/${id}/scalability`,
  PROJECT_TECH_DEBT:     (id: string) => `/workspace/project/${id}/technical-debt`,
  PROJECT_AI_CTO:        (id: string) => `/workspace/project/${id}/ai-cto`,
  PROJECT_FIXES:         (id: string) => `/workspace/project/${id}/fixes`,
  PROJECT_REPORTS:       (id: string) => `/workspace/project/${id}/reports`,
  PROJECT_SETTINGS:      (id: string) => `/workspace/project/${id}/settings`,
} as const;

// ─── Navigation Items ─────────────────────────────────────────────

export interface NavItem {
  key:      string;
  label:    string;
  icon:     string; // Lucide icon name
  route:    (projectId: string) => string;
  badge?:   'new' | 'beta';
  dividerAfter?: boolean;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { key: 'overview',      label: 'Overview',       icon: 'LayoutDashboard', route: ROUTES.PROJECT_OVERVIEW },
  { key: 'architecture',  label: 'Architecture',   icon: 'GitBranch',       route: ROUTES.PROJECT_ARCHITECTURE },
  { key: 'security',      label: 'Security',       icon: 'Shield',          route: ROUTES.PROJECT_SECURITY },
  { key: 'performance',   label: 'Performance',    icon: 'Zap',             route: ROUTES.PROJECT_PERFORMANCE },
  { key: 'cloud',         label: 'Cloud Cost',     icon: 'Cloud',           route: ROUTES.PROJECT_CLOUD },
  { key: 'scalability',   label: 'Scalability',    icon: 'TrendingUp',      route: ROUTES.PROJECT_SCALABILITY },
  { key: 'technical-debt',label: 'Technical Debt', icon: 'AlertTriangle',   route: ROUTES.PROJECT_TECH_DEBT, dividerAfter: true },
  { key: 'ai-cto',        label: 'AI CTO',         icon: 'Bot',             route: ROUTES.PROJECT_AI_CTO, badge: 'new' },
  { key: 'fixes',         label: 'One-Click Fixes',icon: 'Wrench',          route: ROUTES.PROJECT_FIXES },
  { key: 'reports',       label: 'Reports',        icon: 'FileText',        route: ROUTES.PROJECT_REPORTS, dividerAfter: true },
  { key: 'settings',      label: 'Settings',       icon: 'Settings',        route: ROUTES.PROJECT_SETTINGS },
];

// ─── Theme Constants ──────────────────────────────────────────────

export const THEME = {
  NAVBAR_HEIGHT:             60,
  SIDEBAR_WIDTH:             240,
  SIDEBAR_COLLAPSED_WIDTH:   64,
  CTO_CONSOLE_HEIGHT:        320,
  CONTENT_MAX_WIDTH:         1280,
  CARD_PADDING:              24,
  SECTION_SPACING:           48,
} as const;

// ─── Colors ───────────────────────────────────────────────────────

export const COLORS = {
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  primaryDark: '#047857',
  secondary: '#64748B',
  bg: '#FAFAFA',
  bgCard: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
} as const;

export const SEVERITY_COLORS = {
  critical: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', dot: '#EF4444' },
  high:     { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', dot: '#F59E0B' },
  medium:   { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047', dot: '#EAB308' },
  low:      { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD', dot: '#3B82F6' },
  info:     { bg: '#F0FDF4', text: '#16A34A', border: '#86EFAC', dot: '#22C55E' },
} as const;

export const STATUS_COLORS = {
  active:   { bg: '#D1FAE5', text: '#065F46' },
  pending:  { bg: '#FEF3C7', text: '#92400E' },
  scanning: { bg: '#DBEAFE', text: '#1E3A5F' },
  error:    { bg: '#FEE2E2', text: '#7F1D1D' },
  success:  { bg: '#D1FAE5', text: '#065F46' },
  archived: { bg: '#F3F4F6', text: '#374151' },
} as const;

// ─── Animation Durations ──────────────────────────────────────────

export const ANIMATION = {
  DURATION: {
    fast:    0.15,
    base:    0.2,
    smooth:  0.25,
    slow:    0.35,
    slower:  0.5,
  },
  EASING: {
    ease:      [0.4, 0, 0.2, 1]   as number[],
    easeIn:    [0.4, 0, 1, 1]     as number[],
    easeOut:   [0, 0, 0.2, 1]     as number[],
    spring:    [0.34, 1.56, 0.64, 1] as number[],
  },
  STAGGER: 0.05,
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

// ─── Status Labels ────────────────────────────────────────────────

export const STATUS_LABELS = {
  active:   'Active',
  archived: 'Archived',
  scanning: 'Scanning',
  pending:  'Pending',
  error:    'Error',
  success:  'Complete',
} as const;

export const SEVERITY_LABELS = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  info:     'Info',
} as const;

// ─── Launch Score Thresholds ──────────────────────────────────────

export const LAUNCH_SCORE_THRESHOLDS = {
  READY:   80, // ≥ 80 → launch-ready
  CAUTION: 60, // 60–79 → launch-with-caution
  // < 60 → not-ready
} as const;

// ─── Pagination ───────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
