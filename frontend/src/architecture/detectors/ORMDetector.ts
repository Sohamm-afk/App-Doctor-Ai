import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectORMs(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // Prisma
  const hasPrismaDep = evidence.dependencies.has('prisma') || evidence.dependencies.has('@prisma/client');
  const hasPrismaFile = Array.from(evidence.files).some(f => f.endsWith('schema.prisma'));
  if (hasPrismaDep) {
    detections.push({
      name: 'Prisma',
      confidence: 100,
      evidence: ['package.json (prisma dependency)']
    });
  } else if (hasPrismaFile) {
    detections.push({
      name: 'Prisma',
      confidence: 95,
      evidence: ['Prisma schema file exists']
    });
  }

  // Mongoose
  const hasMongooseDep = evidence.dependencies.has('mongoose');
  const hasMongooseImport = evidence.imports.has('mongoose');
  if (hasMongooseDep) {
    detections.push({
      name: 'Mongoose',
      confidence: 100,
      evidence: ['package.json (mongoose dependency)']
    });
  } else if (hasMongooseImport) {
    detections.push({
      name: 'Mongoose',
      confidence: 90,
      evidence: ['Imports: mongoose in code']
    });
  }

  // TypeORM
  const hasTypeOrmDep = evidence.dependencies.has('typeorm');
  const hasTypeOrmConfig = Array.from(evidence.files).some(f => f.split('/').pop()?.toLowerCase().startsWith('ormconfig.'));
  if (hasTypeOrmDep) {
    detections.push({
      name: 'TypeORM',
      confidence: 100,
      evidence: ['package.json (typeorm dependency)']
    });
  } else if (hasTypeOrmConfig) {
    detections.push({
      name: 'TypeORM',
      confidence: 90,
      evidence: ['TypeORM config file exists']
    });
  }

  // Drizzle
  const hasDrizzleDep = evidence.dependencies.has('drizzle-orm');
  const hasDrizzleConfig = Array.from(evidence.files).some(f => f.split('/').pop()?.toLowerCase().startsWith('drizzle.config.'));
  if (hasDrizzleDep) {
    detections.push({
      name: 'Drizzle',
      confidence: 100,
      evidence: ['package.json (drizzle-orm dependency)']
    });
  } else if (hasDrizzleConfig) {
    detections.push({
      name: 'Drizzle',
      confidence: 90,
      evidence: ['Drizzle config file exists']
    });
  }

  // Sequelize
  const hasSequelizeDep = evidence.dependencies.has('sequelize');
  const hasSequelizeRC = Array.from(evidence.files).some(f => f.endsWith('.sequelizerc'));
  if (hasSequelizeDep) {
    detections.push({
      name: 'Sequelize',
      confidence: 100,
      evidence: ['package.json (sequelize dependency)']
    });
  } else if (hasSequelizeRC) {
    detections.push({
      name: 'Sequelize',
      confidence: 90,
      evidence: ['.sequelizerc file exists']
    });
  }

  return detections;
}
