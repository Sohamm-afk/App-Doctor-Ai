/**
 * API configuration.
 * When the FastAPI backend is ready, set VITE_API_BASE_URL in .env.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export const API_CONFIG = {
  BASE_URL:    API_BASE_URL,
  TIMEOUT:     30_000, // 30 seconds
  VERSION:     'v1',
  get V1_URL() {
    return `${this.BASE_URL}/api/${this.VERSION}`;
  },
} as const;

export const API_ENDPOINTS = {
  // Projects
  PROJECTS:         '/projects',
  PROJECT_BY_ID:    (id: string) => `/projects/${id}`,
  PROJECT_SCAN:     (id: string) => `/projects/${id}/scan`,
  PROJECT_SCORE:    (id: string) => `/projects/${id}/score`,

  // Security
  SECURITY:         (projectId: string) => `/projects/${projectId}/security`,

  // Performance
  PERFORMANCE:      (projectId: string) => `/projects/${projectId}/performance`,

  // Cloud
  CLOUD:            (projectId: string) => `/projects/${projectId}/cloud`,

  // Architecture
  ARCHITECTURE:     (projectId: string) => `/projects/${projectId}/architecture`,

  // Chat / AI CTO
  CHAT_SESSIONS:    (projectId: string) => `/projects/${projectId}/chat`,
  CHAT_MESSAGE:     (sessionId: string) => `/chat/${sessionId}/message`,

  // Reports
  REPORTS:          (projectId: string) => `/projects/${projectId}/reports`,
  REPORT_DOWNLOAD:  (reportId: string)  => `/reports/${reportId}/download`,
} as const;
