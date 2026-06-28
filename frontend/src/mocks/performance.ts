import type { PerformanceMetric, PerformanceTimeSeries } from '@/types';

export const MOCK_PERFORMANCE_METRICS: PerformanceMetric[] = [
  {
    id: 'perf-001', projectId: 'proj-001',
    name: 'API Response Time (p95)',
    value: 420, unit: 'ms', baseline: 200,
    threshold: { warning: 300, critical: 800 },
    trend: 'up', category: 'response-time',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'perf-002', projectId: 'proj-001',
    name: 'Throughput',
    value: 1240, unit: 'req/s', baseline: 1000,
    threshold: { warning: 500, critical: 200 },
    trend: 'up', category: 'throughput',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'perf-003', projectId: 'proj-001',
    name: 'Error Rate',
    value: 0.8, unit: '%', baseline: 0.5,
    threshold: { warning: 1.0, critical: 5.0 },
    trend: 'stable', category: 'error-rate',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'perf-004', projectId: 'proj-001',
    name: 'Memory Usage',
    value: 68, unit: '%', baseline: 55,
    threshold: { warning: 75, critical: 90 },
    trend: 'up', category: 'memory',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'perf-005', projectId: 'proj-001',
    name: 'Database Query Time (avg)',
    value: 45, unit: 'ms', baseline: 30,
    threshold: { warning: 100, critical: 500 },
    trend: 'stable', category: 'database',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'perf-006', projectId: 'proj-001',
    name: 'Cache Hit Rate',
    value: 87, unit: '%', baseline: 90,
    threshold: { warning: 70, critical: 50 },
    trend: 'down', category: 'cache',
    recordedAt: new Date().toISOString(),
  },
];

/** Generate 30 days of synthetic time series data */
function generateTimeSeries(base: number, variance: number): PerformanceTimeSeries[] {
  return Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
    value: Math.max(0, base + (Math.random() - 0.5) * variance),
  }));
}

export const MOCK_RESPONSE_TIME_SERIES = generateTimeSeries(380, 200);
export const MOCK_THROUGHPUT_SERIES    = generateTimeSeries(1200, 400);
export const MOCK_ERROR_RATE_SERIES    = generateTimeSeries(0.7, 1.2);
export const MOCK_MEMORY_SERIES        = generateTimeSeries(65, 15);

export function getMockPerformanceMetrics(projectId: string): PerformanceMetric[] {
  return MOCK_PERFORMANCE_METRICS.filter((m) => m.projectId === projectId);
}
