/**
 * Future API service layer.
 *
 * This file will be populated when the FastAPI backend is ready.
 * All functions here will replace the mock service counterparts.
 * The function signatures should remain identical so UI components
 * require no changes.
 */
import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from './config';
import type { Project, SecurityIssue, PerformanceMetric, CloudEstimate, Report, ChatMessage } from '@/types';

const http = axios.create({
  baseURL: API_CONFIG.V1_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor (auth token injection) ───────────────────
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor (error normalization) ───────────────────
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Normalize error shape for UI consumption
    const message = err.response?.data?.detail ?? err.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  },
);

// ─── Future API Functions ─────────────────────────────────────────
// (Uncomment when backend is ready)

export async function apiGetProjects(): Promise<Project[]> {
  const { data } = await http.get<Project[]>(API_ENDPOINTS.PROJECTS);
  return data;
}

export async function apiGetProject(id: string): Promise<Project> {
  const { data } = await http.get<Project>(API_ENDPOINTS.PROJECT_BY_ID(id));
  return data;
}

export async function apiGetSecurityIssues(projectId: string): Promise<SecurityIssue[]> {
  const { data } = await http.get<SecurityIssue[]>(API_ENDPOINTS.SECURITY(projectId));
  return data;
}

export async function apiGetPerformanceMetrics(projectId: string): Promise<PerformanceMetric[]> {
  const { data } = await http.get<PerformanceMetric[]>(API_ENDPOINTS.PERFORMANCE(projectId));
  return data;
}

export async function apiGetCloudEstimate(projectId: string): Promise<CloudEstimate> {
  const { data } = await http.get<CloudEstimate>(API_ENDPOINTS.CLOUD(projectId));
  return data;
}

export async function apiGetReports(projectId: string): Promise<Report[]> {
  const { data } = await http.get<Report[]>(API_ENDPOINTS.REPORTS(projectId));
  return data;
}

export async function apiSendChatMessage(sessionId: string, content: string): Promise<ChatMessage> {
  const { data } = await http.post<ChatMessage>(API_ENDPOINTS.CHAT_MESSAGE(sessionId), { content });
  return data;
}

export { http };
