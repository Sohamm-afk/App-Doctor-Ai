import type { Report } from '@/types';

export const MOCK_REPORTS: Report[] = [
  {
    id: 'report-001', projectId: 'proj-001',
    title: 'Full Security Audit — E-Commerce Platform',
    type: 'security', status: 'ready', format: 'pdf',
    size: 2_450_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    downloadUrl: '#',
  },
  {
    id: 'report-002', projectId: 'proj-001',
    title: 'Executive Summary — Q3 2026',
    type: 'executive-summary', status: 'ready', format: 'pdf',
    size: 890_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    downloadUrl: '#',
  },
  {
    id: 'report-003', projectId: 'proj-001',
    title: 'Cloud Cost Optimization Report',
    type: 'cloud-cost', status: 'ready', format: 'markdown',
    size: 145_000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    downloadUrl: '#',
  },
  {
    id: 'report-004', projectId: 'proj-001',
    title: 'Technical Debt Analysis',
    type: 'technical-debt', status: 'generating', format: 'pdf',
    createdAt: new Date().toISOString(),
  },
];

export function getMockReports(projectId: string): Report[] {
  return MOCK_REPORTS.filter((r) => r.projectId === projectId);
}
