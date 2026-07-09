import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectFrameworks(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // 1. NestJS
  if (evidence.dependencies.has('@nestjs/core') || evidence.dependencies.has('@nestjs/common')) {
    detections.push({
      name: 'NestJS',
      confidence: 100,
      evidence: ['package.json (nestjs dependencies)']
    });
  } else {
    const nestFiles = Array.from(evidence.files).filter(f => f.endsWith('.module.ts') || f.endsWith('.controller.ts'));
    if (nestFiles.length >= 2) {
      detections.push({
        name: 'NestJS',
        confidence: 90,
        evidence: nestFiles.slice(0, 3).map(f => `Structure: ${f}`)
      });
    }
  }

  // 2. Express
  if (evidence.dependencies.has('express')) {
    detections.push({
      name: 'Express',
      confidence: 100,
      evidence: ['package.json (express dependency)']
    });
  } else if (evidence.imports.has('express')) {
    detections.push({
      name: 'Express',
      confidence: 95,
      evidence: ['Imports: express in source code']
    });
  }

  // 3. Spring Boot
  const hasSpringDep = Array.from(evidence.dependencies).some(d => d.includes('spring-boot') || d.includes('springframework.boot'));
  if (hasSpringDep) {
    detections.push({
      name: 'Spring Boot',
      confidence: 100,
      evidence: ['Build manifest (spring-boot dependencies)']
    });
  } else if (evidence.files.has('pom.xml') || evidence.files.has('build.gradle')) {
    const javaFiles = Array.from(evidence.files).filter(f => f.endsWith('.java'));
    if (javaFiles.some(f => f.toLowerCase().includes('application'))) {
      detections.push({
        name: 'Spring Boot',
        confidence: 80,
        evidence: ['pom.xml / build.gradle and Java Entry Application source file']
      });
    }
  }

  // 4. FastAPI
  if (evidence.dependencies.has('fastapi') || evidence.imports.has('fastapi')) {
    detections.push({
      name: 'FastAPI',
      confidence: 100,
      evidence: ['Python requirements / imports (fastapi)']
    });
  }

  // 5. Django
  if (evidence.dependencies.has('django') || evidence.imports.has('django')) {
    detections.push({
      name: 'Django',
      confidence: 100,
      evidence: ['Python requirements / imports (django)']
    });
  } else if (evidence.files.has('manage.py')) {
    detections.push({
      name: 'Django',
      confidence: 90,
      evidence: ['manage.py project entry file']
    });
  }

  // 6. Laravel
  if (evidence.dependencies.has('laravel/framework') || evidence.dependencies.has('laravel')) {
    detections.push({
      name: 'Laravel',
      confidence: 100,
      evidence: ['composer.json (laravel/framework dependency)']
    });
  } else if (evidence.files.has('artisan')) {
    detections.push({
      name: 'Laravel',
      confidence: 90,
      evidence: ['artisan CLI entry file']
    });
  }

  return detections;
}
