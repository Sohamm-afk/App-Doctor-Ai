import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectCache(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // Redis
  const isRedisDep = evidence.dependencies.has('redis') || evidence.dependencies.has('ioredis');
  const isRedisImport = evidence.imports.has('redis') || evidence.imports.has('ioredis');
  const isRedisCall = evidence.imports.has('createclient()') || evidence.imports.has('redis.createclient()');

  if (isRedisDep) {
    detections.push({
      name: 'Redis',
      confidence: 100,
      evidence: ['package.json (redis or ioredis dependency)']
    });
  } else if (isRedisImport) {
    detections.push({
      name: 'Redis',
      confidence: 95,
      evidence: ['Imports: redis or ioredis in source code']
    });
  } else if (isRedisCall) {
    detections.push({
      name: 'Redis',
      confidence: 85,
      evidence: ['Code signature: createClient() or redis.createClient()']
    });
  }

  return detections;
}
