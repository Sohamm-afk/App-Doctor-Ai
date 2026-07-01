/**
 * Mock service layer.
 *
 * Intercepts calls and returns real backend findings from localStorage cache if present,
 * or returns empty sets for a clean non-fabricated interface.
 */
import type {
  Project, SecurityIssue, PerformanceMetric,
  CloudEstimate, Report, ChatMessage, ChatSession,
} from '@/types';
import { generateId } from '@/utils';
import axios from 'axios';

/** Simulate a network delay. */
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Projects ─────────────────────────────────────────────────────

export async function mockGetProjects(): Promise<Project[]> {
  await delay(200);
  const listStr = localStorage.getItem('scanned_projects_list') || '[]';
  const ids: string[] = JSON.parse(listStr);
  const projects: Project[] = [];
  for (const id of ids) {
    const p = await mockGetProject(id);
    if (p) projects.push(p);
  }
  return projects;
}

export async function mockGetProject(id: string): Promise<Project | undefined> {
  await delay(200);
  const localScanData = localStorage.getItem(`scan_result_${id}`);
  if (localScanData) {
    const scanData = JSON.parse(localScanData);
    return {
      id,
      name: scanData.metadata?.project_name || 'Unnamed Project',
      description: `Real-time repository analysis for ${scanData.metadata?.repository_name}.`,
      repositoryUrl: scanData.metadata?.repository_name ? `https://github.com/${scanData.metadata.repository_name}` : '',
      language: (((scanData.metadata?.languages || [])[0] || 'unknown').toLowerCase() as any),
      framework: scanData.metadata?.frontend || scanData.metadata?.backend || 'Other',
      status: 'active',
      launchScore: scanData.launch_score?.overall ?? 74,
      lastScannedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cloudProvider: 'other',
      teamSize: 1,
      tags: scanData.metadata?.languages || [],
    };
  }
  return undefined;
}

// ─── Security ─────────────────────────────────────────────────────

export async function mockGetSecurityIssues(projectId: string): Promise<SecurityIssue[]> {
  await delay(300);
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const scanData = JSON.parse(localScanData);
    return (scanData.security_findings ?? []).map((f: any, idx: number) => ({
      id: `sec-${idx}`,
      projectId,
      title: f.title,
      description: f.description,
      severity: f.severity,
      category: f.title.toLowerCase().includes('secret') || f.title.toLowerCase().includes('password') ? 'sensitive-data' : 'injection',
      filePath: f.file,
      lineNumber: f.lineNumber,
      remediation: `Inspect file at ${f.file} line ${f.lineNumber} to resolve: ${f.description}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    }));
  }
  return [];
}

// ─── Performance ──────────────────────────────────────────────────

export async function mockGetPerformanceMetrics(projectId: string): Promise<PerformanceMetric[]> {
  await delay(200);
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const scanData = JSON.parse(localScanData);
    return (scanData.performance_findings ?? []).map((f: any, idx: number) => ({
      id: `perf-${idx}`,
      projectId,
      name: f.title,
      value: f.severity === 'high' ? 85 : f.severity === 'medium' ? 60 : 40,
      unit: '%',
      baseline: 30,
      threshold: { warning: 50, critical: 80 },
      trend: 'stable',
      category: 'response-time',
      recordedAt: new Date().toISOString(),
    }));
  }
  return [];
}

// ─── Cloud ────────────────────────────────────────────────────────

export async function mockGetCloudEstimate(projectId: string): Promise<CloudEstimate | undefined> {
  await delay(300);
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const scanData = JSON.parse(localScanData);
    const monthlyEstimate = (scanData.launch_score?.cloud ?? 80) > 80 ? 120 : 340;
    return {
      id: `cloud-${projectId}`,
      projectId,
      provider: 'other',
      monthlyEstimate,
      annualEstimate: monthlyEstimate * 12,
      currency: 'USD',
      breakdown: [
        { service: 'Compute', cost: monthlyEstimate * 0.6, percentage: 60 },
        { service: 'Storage', cost: monthlyEstimate * 0.2, percentage: 20 },
        { service: 'Database', cost: monthlyEstimate * 0.2, percentage: 20 },
      ],
      optimizations: (scanData.deployment_findings ?? []).map((d: any, idx: number) => ({
        id: `opt-${idx}`,
        title: `Deploy using ${d.type}`,
        description: `Utilize discovered configuration at ${d.configPath} for containerized deployment.`,
        savings: 45,
        effort: 'low',
        impact: 'medium'
      })),
      updatedAt: new Date().toISOString()
    };
  }
  return undefined;
}

// ─── Reports ──────────────────────────────────────────────────────

export async function mockGetReports(projectId: string): Promise<Report[]> {
  await delay(300);
  const listStr = localStorage.getItem(`reports_list_${projectId}`);
  if (listStr) {
    return JSON.parse(listStr);
  }
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const defaultReports: Report[] = [
      {
        id: 'rep-1',
        projectId,
        title: 'Static Code Quality Audit',
        type: 'full-audit',
        status: 'ready',
        format: 'pdf',
        size: 1024 * 124,
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      }
    ];
    localStorage.setItem(`reports_list_${projectId}`, JSON.stringify(defaultReports));
    return defaultReports;
  }
  return [];
}

// ─── Chat ─────────────────────────────────────────────────────────

export async function mockGetChatSession(projectId: string): Promise<ChatSession> {
  await delay(200);
  const review = localStorage.getItem(`aicto_review_${projectId}`);
  if (review) {
    return {
      id: `chat-${projectId}`,
      projectId,
      title: 'AI CTO Conversation',
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: review,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const scanResult = JSON.parse(localScanData);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
      const { data } = await axios.post(`${apiBaseUrl}/api/ai/review`, { scanResult });
      if (data.review) {
        localStorage.setItem(`aicto_review_${projectId}`, data.review);
        return {
          id: `chat-${projectId}`,
          projectId,
          title: 'AI CTO Conversation',
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              content: data.review,
              timestamp: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.error('Failed to get review from Gemini backend:', err);
    }
  }

  return {
    id: `chat-${projectId}`,
    projectId,
    title: 'AI CTO Conversation',
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I am your AI CTO. Strategic review is currently unavailable. Please verify your backend server or scan status.",
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function mockSendChatMessage(sessionId: string, content: string): Promise<ChatMessage> {
  await delay(200);
  const projectId = sessionId.replace('chat-', '');
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  const scanResult = localScanData ? JSON.parse(localScanData) : null;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  try {
    const { data } = await axios.post(`${apiBaseUrl}/api/ai/chat`, {
      message: content,
      history: [],
      scanResult
    });
    if (data.reply) {
      return {
        id:        generateId('msg'),
        role:      'assistant',
        content:   data.reply,
        timestamp: new Date().toISOString(),
        isStreaming: false,
      };
    }
  } catch (err) {
    console.error('Failed to stream real AI response:', err);
  }

  return {
    id:        generateId('msg'),
    role:      'assistant',
    content:   `Connection issue. Failed to reach the Gemini AI CTO server. Please confirm the GEMINI_API_KEY environment variable.`,
    timestamp: new Date().toISOString(),
    isStreaming: false,
  };
}

// ─── Architecture ─────────────────────────────────────────────────

export async function mockGetArchitecture(projectId: string) {
  await delay(300);
  const localScanData = localStorage.getItem(`scan_result_${projectId}`);
  if (localScanData) {
    const scanData = JSON.parse(localScanData);
    if (scanData.architecture) {
      return scanData.architecture;
    }
  }
  return { nodes: [], edges: [] };
}

// ─── Export all for easy switching ───────────────────────────────

export const mockService = {
  getProjects:          mockGetProjects,
  getProject:           mockGetProject,
  getSecurityIssues:    mockGetSecurityIssues,
  getPerformanceMetrics:mockGetPerformanceMetrics,
  getCloudEstimate:     mockGetCloudEstimate,
  getReports:           mockGetReports,
  getChatSession:       mockGetChatSession,
  sendChatMessage:      mockSendChatMessage,
  getArchitecture:      mockGetArchitecture,
} as const;
