import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectDeployment(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // Docker
  const dockerFiles = ['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml', 'compose.yml'];
  const matchedDocker = Array.from(evidence.files).filter(f => {
    const name = f.split('/').pop()?.toLowerCase() || '';
    return dockerFiles.includes(name);
  });

  if (matchedDocker.length > 0) {
    detections.push({
      name: 'Docker',
      confidence: 100,
      evidence: matchedDocker.map(f => `Manifest: ${f}`)
    });
  }

  // Kubernetes
  const k8sFiles = ['deployment.yaml', 'deployment.yml', 'service.yaml', 'service.yml', 'ingress.yaml', 'ingress.yml'];
  const hasK8sFolder = Array.from(evidence.folders).some(f => f.toLowerCase() === 'k8s' || f.toLowerCase() === 'kubernetes' || f.toLowerCase() === 'helm');
  const matchedK8s = Array.from(evidence.files).filter(f => {
    const name = f.split('/').pop()?.toLowerCase() || '';
    return k8sFiles.includes(name);
  });

  if (matchedK8s.length > 0) {
    detections.push({
      name: 'Kubernetes',
      confidence: 100,
      evidence: matchedK8s.map(f => `Manifest: ${f}`)
    });
  } else if (hasK8sFolder) {
    detections.push({
      name: 'Kubernetes',
      confidence: 90,
      evidence: [`Directory: k8s/kubernetes/helm folder exists`]
    });
  }

  // GitHub Actions
  const hasGithubActions = Array.from(evidence.files).some(f => f.toLowerCase().includes('.github/workflows/'));
  if (hasGithubActions) {
    detections.push({
      name: 'GitHub Actions',
      confidence: 100,
      evidence: ['.github/workflows/ configuration directory']
    });
  }

  return detections;
}
