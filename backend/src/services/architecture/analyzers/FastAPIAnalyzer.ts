import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class FastAPIAnalyzer implements IRepositoryAnalyzer {
  name = 'FastAPI';

  supports(profile: any): boolean {
    return profile.framework === 'FastAPI';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { sourceFiles } = ctx;

    const { comp, getDatabaseEvidence } = require('../Stage2_StaticAnalyzer');

    const mainFile    = sourceFiles.filter(f => ['main.py', 'app.py', 'run.py'].includes(path.basename(f).toLowerCase()));
    const routerFiles = sourceFiles.filter(f => f.toLowerCase().includes('router') || f.toLowerCase().includes('/api/') || f.toLowerCase().includes('/endpoints/'));
    const schemaFiles = sourceFiles.filter(f => f.toLowerCase().includes('schema') || f.toLowerCase().includes('/models/') || f.toLowerCase().includes('pydantic'));
    const depFiles    = sourceFiles.filter(f => f.toLowerCase().includes('depend') || f.toLowerCase().includes('auth.py') || f.toLowerCase().includes('security.py'));
    const crudFiles   = sourceFiles.filter(f => f.toLowerCase().includes('crud') || f.toLowerCase().includes('services/') || f.toLowerCase().includes('helper'));

    if (mainFile.length) {
      components.push(comp('bootstrap', 'FastAPI App Bootstrap', 'entry', 'Application Host', 'ENTRY LAYER',
        'Initializes FastAPI core engine, registers routing tables, and hooks middleware hooks.', 'FastAPI', 95, mainFile, mainFile, 0));
    }
    if (routerFiles.length) {
      components.push(comp('routers', 'FastAPI API Routers', 'router', 'Routing Layer', 'ROUTING LAYER',
        'Verifiable API routes mapping incoming HTTP endpoints to handlers.', 'FastAPI Routers', 90, routerFiles.slice(0, 4), routerFiles, 1));
    }
    if (depFiles.length) {
      components.push(comp('dependencies', 'Dependency Injectors', 'middleware', 'Dependency Layer', 'MIDDLEWARE LAYER',
        'Depends() dependency injection layer enforcing request security and state validations.', 'FastAPI Depends', 88, depFiles.slice(0, 2), depFiles, 2));
    }
    if (schemaFiles.length) {
      components.push(comp('schemas', 'Pydantic Data Schemas', 'module', 'Contract Layer', 'CONTRACT LAYER',
        'Pydantic schemas serializing inputs and formatting response structures.', 'Pydantic', 88, schemaFiles.slice(0, 4), schemaFiles, 3));
    }
    if (crudFiles.length) {
      components.push(comp('crud', 'CRUD Operations', 'service', 'Database Query Layer', 'SERVICE LAYER',
        'CRUD query methods encapsulating data mutations and reads.', 'Python CRUD', 85, crudFiles.slice(0, 4), crudFiles, 4));
    }

    const pgEv = getDatabaseEvidence(ctx, 'postgres');
    if (pgEv.length) {
      components.push(comp('data-access', 'PostgreSQL DB Persistence', 'database', 'Data Access Layer', 'DATA LAYER',
        'Relational database engine storing model states.', 'PostgreSQL', 90, pgEv.slice(0, 2), pgEv, 5));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'routers')) {
      relationships.push(rel('bootstrap', 'routers', 'registers route mappings on', 'configures'));
    }
    if (components.find(c => c.id === 'routers') && components.find(c => c.id === 'dependencies')) {
      relationships.push(rel('routers', 'dependencies', 'validates context via', 'uses'));
    }
    if (components.find(c => c.id === 'routers') && components.find(c => c.id === 'schemas')) {
      relationships.push(rel('routers', 'schemas', 'validates inputs via', 'transforms'));
    }
    if (components.find(c => c.id === 'routers') && components.find(c => c.id === 'crud')) {
      relationships.push(rel('routers', 'crud', 'delegates queries to', 'delegates'));
    }
    const dbComp = components.find(c => c.id === 'data-access');
    if (components.find(c => c.id === 'crud') && dbComp) {
      relationships.push(rel('crud', dbComp.id, 'queries database sessions from', 'uses'));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
