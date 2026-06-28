/**
 * Mock service layer.
 *
 * All functions here simulate async API calls using local mock data.
 * They have identical signatures to the functions in api/future.ts
 * so that switching to the real backend requires only changing the import.
 */
import { MOCK_PROJECTS, getMockProject } from '@/mocks/projects';
import { MOCK_SECURITY_ISSUES, getMockSecurityIssues } from '@/mocks/security';
import { MOCK_PERFORMANCE_METRICS, getMockPerformanceMetrics } from '@/mocks/performance';
import { getMockCloudEstimate } from '@/mocks/cloud';
import { MOCK_CHAT_SESSION, MOCK_SUGGESTED_PROMPTS } from '@/mocks/chat';
import { getMockReports } from '@/mocks/reports';
import { getMockArchitecture } from '@/mocks/architecture';
import type {
  Project, SecurityIssue, PerformanceMetric,
  CloudEstimate, Report, ChatMessage, ChatSession,
} from '@/types';
import { generateId } from '@/utils';

/** Simulate a network delay. */
const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Projects ─────────────────────────────────────────────────────

export async function mockGetProjects(): Promise<Project[]> {
  await delay(400);
  return MOCK_PROJECTS;
}

export async function mockGetProject(id: string): Promise<Project | undefined> {
  await delay(300);
  return getMockProject(id);
}

// ─── Security ─────────────────────────────────────────────────────

export async function mockGetSecurityIssues(projectId: string): Promise<SecurityIssue[]> {
  await delay(500);
  return getMockSecurityIssues(projectId);
}

export { MOCK_SECURITY_ISSUES };

// ─── Performance ──────────────────────────────────────────────────

export async function mockGetPerformanceMetrics(projectId: string): Promise<PerformanceMetric[]> {
  await delay(400);
  return getMockPerformanceMetrics(projectId);
}

export { MOCK_PERFORMANCE_METRICS };

// ─── Cloud ────────────────────────────────────────────────────────

export async function mockGetCloudEstimate(projectId: string): Promise<CloudEstimate | undefined> {
  await delay(500);
  return getMockCloudEstimate(projectId);
}

// ─── Reports ──────────────────────────────────────────────────────

export async function mockGetReports(projectId: string): Promise<Report[]> {
  await delay(600);
  return getMockReports(projectId);
}

// ─── Chat ─────────────────────────────────────────────────────────

export async function mockGetChatSession(projectId: string): Promise<ChatSession> {
  await delay(300);
  void projectId;
  return MOCK_CHAT_SESSION;
}

export async function mockSendChatMessage(_sessionId: string, content: string): Promise<ChatMessage> {
  await delay(1200);
  return {
    id:        generateId('msg'),
    role:      'assistant',
    content:   `I've received your message: "${content}". This is a mock response. When connected to the backend, this will stream a real AI response.`,
    timestamp: new Date().toISOString(),
    isStreaming: false,
  };
}

export { MOCK_SUGGESTED_PROMPTS };

// ─── Architecture ─────────────────────────────────────────────────

export async function mockGetArchitecture(projectId: string) {
  await delay(700);
  return getMockArchitecture(projectId);
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
