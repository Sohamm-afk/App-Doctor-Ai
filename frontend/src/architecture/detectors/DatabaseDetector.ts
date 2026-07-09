import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectDatabases(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // 1. PostgreSQL
  const pgDeps = ['pg', 'pg-pool', 'postgres'];
  const hasPgDep = pgDeps.some(d => evidence.dependencies.has(d));
  const hasPgImport = pgDeps.some(i => evidence.imports.has(i));
  const hasPgEnv = evidence.imports.has('database_url') || evidence.imports.has('postgres');

  if (hasPgDep) {
    detections.push({
      name: 'PostgreSQL',
      confidence: 100,
      evidence: ['package.json (postgres package)']
    });
  } else if (hasPgImport) {
    detections.push({
      name: 'PostgreSQL',
      confidence: 95,
      evidence: ['Imports: postgres/pg connector in code']
    });
  } else if (hasPgEnv) {
    detections.push({
      name: 'PostgreSQL',
      confidence: 80,
      evidence: ['Environment/Evidence: DATABASE_URL or postgres string']
    });
  }

  // 2. MongoDB
  const mongoDeps = ['mongodb', 'mongoose'];
  const hasMongoDep = mongoDeps.some(d => evidence.dependencies.has(d));
  const hasMongoImport = mongoDeps.some(i => evidence.imports.has(i));
  const hasMongoEv = evidence.imports.has('mongoclient') || evidence.imports.has('mongodb://');

  if (hasMongoDep) {
    detections.push({
      name: 'MongoDB',
      confidence: 100,
      evidence: ['package.json (mongodb or mongoose package)']
    });
  } else if (hasMongoImport) {
    detections.push({
      name: 'MongoDB',
      confidence: 95,
      evidence: ['Imports: mongoose or mongodb in code']
    });
  } else if (hasMongoEv) {
    detections.push({
      name: 'MongoDB',
      confidence: 85,
      evidence: ['Evidence: MongoClient or mongodb:// connection URI']
    });
  }

  // 3. MySQL
  const mysqlDeps = ['mysql', 'mysql2'];
  const hasMysqlDep = mysqlDeps.some(d => evidence.dependencies.has(d));
  const hasMysqlImport = mysqlDeps.some(i => evidence.imports.has(i));

  if (hasMysqlDep) {
    detections.push({
      name: 'MySQL',
      confidence: 100,
      evidence: ['package.json (mysql or mysql2 package)']
    });
  } else if (hasMysqlImport) {
    detections.push({
      name: 'MySQL',
      confidence: 95,
      evidence: ['Imports: mysql or mysql2 in code']
    });
  }

  // 4. SQLite
  const sqliteDeps = ['sqlite3', 'better-sqlite3', 'better-sqlite'];
  const hasSqliteDep = sqliteDeps.some(d => evidence.dependencies.has(d));
  const hasSqliteImport = sqliteDeps.some(i => evidence.imports.has(i));

  if (hasSqliteDep) {
    detections.push({
      name: 'SQLite',
      confidence: 100,
      evidence: ['package.json (sqlite package)']
    });
  } else if (hasSqliteImport) {
    detections.push({
      name: 'SQLite',
      confidence: 95,
      evidence: ['Imports: sqlite in code']
    });
  }

  return detections;
}
