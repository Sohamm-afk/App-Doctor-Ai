import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';
import { detectFrameworks } from './FrameworkDetector';
import { detectDatabases } from './DatabaseDetector';
import { detectCache } from './CacheDetector';
import { detectAuth } from './AuthDetector';
import { detectDeployment } from './DeploymentDetector';
import { detectMessaging } from './MessagingDetector';
import { detectORMs } from './ORMDetector';
import { detectFrontend } from './FrontendDetector';

export * from './types';

export function detectTechnologies(evidence: RepositoryEvidence): TechnologyDetection[] {
  return [
    ...detectFrameworks(evidence),
    ...detectDatabases(evidence),
    ...detectCache(evidence),
    ...detectAuth(evidence),
    ...detectDeployment(evidence),
    ...detectMessaging(evidence),
    ...detectORMs(evidence),
    ...detectFrontend(evidence),
  ];
}
