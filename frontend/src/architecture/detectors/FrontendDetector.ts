import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectFrontend(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // React
  if (evidence.dependencies.has('react') || evidence.dependencies.has('react-dom')) {
    detections.push({
      name: 'React',
      confidence: 100,
      evidence: ['package.json (react dependencies)']
    });
  }

  // Next.js
  if (evidence.dependencies.has('next')) {
    detections.push({
      name: 'Next.js',
      confidence: 100,
      evidence: ['package.json (next dependency)']
    });
  } else {
    const nextConfig = Array.from(evidence.files).some(f => f.endsWith('next.config.js') || f.endsWith('next.config.mjs') || f.endsWith('next.config.ts'));
    if (nextConfig) {
      detections.push({
        name: 'Next.js',
        confidence: 95,
        evidence: ['Next.js configuration file exists']
      });
    }
  }

  // Vue
  if (evidence.dependencies.has('vue') || evidence.dependencies.has('nuxt')) {
    detections.push({
      name: 'Vue',
      confidence: 100,
      evidence: ['package.json (vue or nuxt dependencies)']
    });
  } else {
    const vueFiles = Array.from(evidence.files).filter(f => f.endsWith('.vue'));
    if (vueFiles.length > 0) {
      detections.push({
        name: 'Vue',
        confidence: 90,
        evidence: [`Vue single file components detected (${vueFiles.length} files)`]
      });
    }
  }

  // Angular
  if (evidence.dependencies.has('@angular/core') || evidence.dependencies.has('@angular/common')) {
    detections.push({
      name: 'Angular',
      confidence: 100,
      evidence: ['package.json (angular dependencies)']
    });
  } else if (evidence.files.has('angular.json')) {
    detections.push({
      name: 'Angular',
      confidence: 95,
      evidence: ['angular.json workspace exists']
    });
  }

  // Axios
  if (evidence.dependencies.has('axios')) {
    detections.push({
      name: 'Axios',
      confidence: 100,
      evidence: ['package.json (axios dependency)']
    });
  } else if (evidence.imports.has('axios')) {
    detections.push({
      name: 'Axios',
      confidence: 90,
      evidence: ['Imports: axios in source code']
    });
  }

  return detections;
}
