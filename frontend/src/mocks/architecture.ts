import type { ArchitectureNode, ArchitectureEdge } from '@/types';

export const MOCK_ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'node-client',
    label: 'Web Client',
    type: 'client',
    position: { x: 400, y: 50 },
    data: { description: 'Next.js SSR + React SPA', technology: 'Next.js', health: 'healthy' },
  },
  {
    id: 'node-cdn',
    label: 'CDN',
    type: 'cdn',
    position: { x: 200, y: 50 },
    data: { description: 'Static asset delivery', technology: 'CloudFront', health: 'healthy' },
  },
  {
    id: 'node-gateway',
    label: 'API Gateway',
    type: 'gateway',
    position: { x: 400, y: 180 },
    data: { description: 'Rate limiting + auth', technology: 'Kong', health: 'warning', metrics: { latency: '12ms' } },
  },
  {
    id: 'node-auth',
    label: 'Auth Service',
    type: 'service',
    position: { x: 150, y: 320 },
    data: { description: 'JWT + OAuth2', technology: 'Node.js', health: 'healthy' },
  },
  {
    id: 'node-product',
    label: 'Product Service',
    type: 'service',
    position: { x: 400, y: 320 },
    data: { description: 'Product catalog & inventory', technology: 'Node.js', health: 'warning' },
  },
  {
    id: 'node-order',
    label: 'Order Service',
    type: 'service',
    position: { x: 650, y: 320 },
    data: { description: 'Order management & payments', technology: 'Node.js', health: 'healthy' },
  },
  {
    id: 'node-db-main',
    label: 'PostgreSQL',
    type: 'database',
    position: { x: 300, y: 480 },
    data: { description: 'Primary relational database', technology: 'PostgreSQL 15', health: 'healthy', metrics: { queries: '4.2k/min' } },
  },
  {
    id: 'node-cache',
    label: 'Redis Cache',
    type: 'cache',
    position: { x: 550, y: 480 },
    data: { description: 'Session & query cache', technology: 'Redis 7', health: 'healthy', metrics: { hitRate: '87%' } },
  },
  {
    id: 'node-queue',
    label: 'Message Queue',
    type: 'queue',
    position: { x: 750, y: 480 },
    data: { description: 'Async event processing', technology: 'RabbitMQ', health: 'critical' },
  },
  {
    id: 'node-storage',
    label: 'S3 Storage',
    type: 'storage',
    position: { x: 150, y: 480 },
    data: { description: 'Media & document storage', technology: 'AWS S3', health: 'healthy' },
  },
];

export const MOCK_ARCHITECTURE_EDGES: ArchitectureEdge[] = [
  { id: 'e-client-gateway', source: 'node-client',  target: 'node-gateway', label: 'HTTPS', data: { protocol: 'REST', latency: 8 } },
  { id: 'e-cdn-client',     source: 'node-cdn',     target: 'node-client',  label: 'CDN',   data: { protocol: 'HTTP/2' } },
  { id: 'e-gateway-auth',   source: 'node-gateway', target: 'node-auth',    label: 'gRPC' },
  { id: 'e-gateway-product',source: 'node-gateway', target: 'node-product', label: 'REST' },
  { id: 'e-gateway-order',  source: 'node-gateway', target: 'node-order',   label: 'REST' },
  { id: 'e-product-db',     source: 'node-product', target: 'node-db-main', label: 'SQL' },
  { id: 'e-order-db',       source: 'node-order',   target: 'node-db-main', label: 'SQL' },
  { id: 'e-product-cache',  source: 'node-product', target: 'node-cache',   label: 'Redis' },
  { id: 'e-order-queue',    source: 'node-order',   target: 'node-queue',   label: 'AMQP' },
  { id: 'e-auth-storage',   source: 'node-auth',    target: 'node-storage', label: 'S3 SDK' },
];

export function getMockArchitecture(projectId: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
  // Future: filter by projectId
  void projectId;
  return { nodes: MOCK_ARCHITECTURE_NODES, edges: MOCK_ARCHITECTURE_EDGES };
}
