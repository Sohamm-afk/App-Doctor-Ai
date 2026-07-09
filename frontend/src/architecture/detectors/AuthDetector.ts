import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectAuth(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // JWT
  const isJwtDep = evidence.dependencies.has('jsonwebtoken') || evidence.dependencies.has('passport-jwt');
  const isJwtImport = evidence.imports.has('jsonwebtoken') || evidence.imports.has('passport-jwt');
  const isJwtCall = evidence.imports.has('jwt.sign()') || evidence.imports.has('jwt.verify()');

  if (isJwtDep) {
    detections.push({
      name: 'JWT',
      confidence: 100,
      evidence: ['package.json (jsonwebtoken or passport-jwt dependency)']
    });
  } else if (isJwtImport) {
    detections.push({
      name: 'JWT',
      confidence: 95,
      evidence: ['Imports: jsonwebtoken in code']
    });
  } else if (isJwtCall) {
    detections.push({
      name: 'JWT',
      confidence: 85,
      evidence: ['Code signature: jwt.sign() or jwt.verify()']
    });
  }

  return detections;
}
