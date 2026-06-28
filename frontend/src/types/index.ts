// ─── Core Domain Types ────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Status   = 'active' | 'archived' | 'scanning' | 'pending' | 'error' | 'success';
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'vercel' | 'railway' | 'render' | 'other';
export type Language =
  | 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java'
  | 'csharp' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'unknown';

// ─── Project ──────────────────────────────────────────────────────

export interface Project {
  id:              string;
  name:            string;
  description:     string;
  repositoryUrl:   string;
  language:        Language;
  framework:       string;
  status:          Status;
  launchScore:     number; // 0-100
  lastScannedAt:   string | null;
  createdAt:       string;
  updatedAt:       string;
  cloudProvider?:  CloudProvider;
  teamSize?:       number;
  tags:            string[];
}

// ─── Security ─────────────────────────────────────────────────────

export interface SecurityIssue {
  id:          string;
  projectId:   string;
  title:       string;
  description: string;
  severity:    Severity;
  category:    SecurityCategory;
  filePath?:   string;
  lineNumber?:  number;
  cveId?:       string;
  cweId?:       string;
  remediation: string;
  status:      'open' | 'resolved' | 'wont-fix' | 'in-progress';
  createdAt:   string;
  resolvedAt?: string;
}

export type SecurityCategory =
  | 'injection'
  | 'authentication'
  | 'sensitive-data'
  | 'xxe'
  | 'access-control'
  | 'security-misconfiguration'
  | 'xss'
  | 'insecure-deserialization'
  | 'known-vulnerabilities'
  | 'logging'
  | 'dependency'
  | 'cryptography'
  | 'other';

// ─── Launch Score ─────────────────────────────────────────────────

export interface LaunchScore {
  projectId:     string;
  overall:       number; // 0-100
  security:      number;
  performance:   number;
  architecture:  number;
  cloudCost:     number;
  scalability:   number;
  codeQuality:   number;
  recommendation: LaunchRecommendation;
  updatedAt:     string;
}

export type LaunchRecommendation = 'launch-ready' | 'launch-with-caution' | 'not-ready';

// ─── Performance ──────────────────────────────────────────────────

export interface PerformanceMetric {
  id:        string;
  projectId: string;
  name:      string;
  value:     number;
  unit:      string;
  baseline?: number;
  threshold: { warning: number; critical: number };
  trend:     'up' | 'down' | 'stable';
  category:  PerformanceCategory;
  recordedAt: string;
}

export type PerformanceCategory =
  | 'response-time'
  | 'throughput'
  | 'error-rate'
  | 'memory'
  | 'cpu'
  | 'database'
  | 'cache'
  | 'network';

export interface PerformanceTimeSeries {
  timestamp: string;
  value:     number;
}

// ─── Cloud Cost ───────────────────────────────────────────────────

export interface CloudEstimate {
  id:              string;
  projectId:       string;
  provider:        CloudProvider;
  monthlyEstimate: number; // USD
  annualEstimate:  number;
  currency:        'USD';
  breakdown: CloudCostBreakdown[];
  optimizations:   CloudOptimization[];
  updatedAt:       string;
}

export interface CloudCostBreakdown {
  service:    string;
  cost:       number;
  percentage: number;
}

export interface CloudOptimization {
  id:          string;
  title:       string;
  description: string;
  savings:     number;
  effort:      'low' | 'medium' | 'high';
  impact:      'low' | 'medium' | 'high';
}

// ─── Architecture ─────────────────────────────────────────────────

export interface ArchitectureNode {
  id:       string;
  label:    string;
  type:     ArchitectureNodeType;
  position: { x: number; y: number };
  data: {
    description?: string;
    technology?:  string;
    health?:      'healthy' | 'warning' | 'critical' | 'unknown';
    metrics?:     Record<string, string | number>;
  };
}

export type ArchitectureNodeType =
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'gateway'
  | 'cdn'
  | 'storage'
  | 'external'
  | 'client'
  | 'load-balancer';

export interface ArchitectureEdge {
  id:     string;
  source: string;
  target: string;
  label?: string;
  type?:  string;
  data?: {
    protocol?: string;
    latency?:  number;
    volume?:   string;
  };
}

// ─── Chat / AI CTO ────────────────────────────────────────────────

export interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant' | 'system';
  content:   string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: {
    sources?:    string[];
    confidence?: number;
    actions?:    SuggestedAction[];
  };
}

export interface SuggestedAction {
  id:    string;
  label: string;
  icon?: string;
  action: string;
}

export interface ChatSession {
  id:        string;
  projectId: string;
  title:     string;
  messages:  ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Technical Debt ───────────────────────────────────────────────

export interface TechnicalDebtEvent {
  id:          string;
  projectId:   string;
  title:       string;
  description: string;
  category:    DebtCategory;
  severity:    Severity;
  effort:      'hours' | 'days' | 'weeks' | 'months';
  estimatedHours: number;
  filePath?:   string;
  createdAt:   string;
  resolvedAt?: string;
  status:      'open' | 'in-progress' | 'resolved' | 'deferred';
}

export type DebtCategory =
  | 'code-duplication'
  | 'deprecated-dependency'
  | 'missing-tests'
  | 'poor-documentation'
  | 'design-pattern-violation'
  | 'performance'
  | 'security'
  | 'scalability'
  | 'configuration'
  | 'other';

// ─── Reports ──────────────────────────────────────────────────────

export interface Report {
  id:          string;
  projectId:   string;
  title:       string;
  type:        ReportType;
  status:      'generating' | 'ready' | 'error';
  format:      'pdf' | 'markdown' | 'json';
  size?:       number;
  createdAt:   string;
  downloadUrl?: string;
}

export type ReportType =
  | 'full-audit'
  | 'security'
  | 'performance'
  | 'cloud-cost'
  | 'architecture'
  | 'technical-debt'
  | 'executive-summary';

// ─── Notification ─────────────────────────────────────────────────

export interface Notification {
  id:        string;
  title:     string;
  message:   string;
  type:      'success' | 'error' | 'warning' | 'info';
  read:      boolean;
  createdAt: string;
  link?:     string;
}

// ─── UI State Types ───────────────────────────────────────────────

export interface ToastMessage {
  id:       string;
  type:     'success' | 'error' | 'warning' | 'info';
  title:    string;
  message?: string;
  duration?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TableColumn<T = Record<string, unknown>> {
  key:       keyof T | string;
  header:    string;
  sortable?: boolean;
  width?:    string;
  render?:   (value: unknown, row: T) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key:       string;
  direction: SortDirection;
}

export interface PaginationState {
  page:     number;
  pageSize: number;
  total:    number;
}
