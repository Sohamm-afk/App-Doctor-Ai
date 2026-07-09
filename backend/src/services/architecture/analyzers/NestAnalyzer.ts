import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class NestAnalyzer implements IRepositoryAnalyzer {
  name = 'NestJS';

  supports(profile: any): boolean {
    return profile.framework === 'NestJS';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { sourceFiles } = ctx;

    const mainFile    = sourceFiles.filter(f => f.toLowerCase().endsWith('main.ts') || f.toLowerCase().endsWith('main.js'));
    const moduleFiles = sourceFiles.filter(f => f.toLowerCase().endsWith('.module.ts'));
    const ctrlFiles   = sourceFiles.filter(f => f.toLowerCase().endsWith('.controller.ts'));
    const svcFiles    = sourceFiles.filter(f => f.toLowerCase().endsWith('.service.ts'));
    const guardFiles  = sourceFiles.filter(f => f.toLowerCase().endsWith('.guard.ts'));
    const pipeFiles   = sourceFiles.filter(f => f.toLowerCase().endsWith('.pipe.ts'));

    const { comp, getDatabaseEvidence } = require('../Stage2_StaticAnalyzer');

    if (mainFile.length) {
      components.push(comp('bootstrap', 'Application Bootstrap', 'entry', 'Application Bootstrap', 'ENTRY LAYER',
        'Initializes NestFactory, boots the root module, and maps global middleware.', 'NestJS', 95, mainFile, mainFile, 0));
    }
    if (moduleFiles.length) {
      components.push(comp('modules', 'Feature Modules', 'module', 'Module System', 'MODULE LAYER',
        'Verifiable NestJS modular boundaries organizing controllers and services.', 'NestJS', 90, moduleFiles.slice(0, 4), moduleFiles, 1));
    }
    if (ctrlFiles.length) {
      components.push(comp('controllers', 'HTTP Controllers', 'controller', 'Request Handler Layer', 'CONTROLLER LAYER',
        'API request handlers executing route declarations.', 'NestJS', 90, ctrlFiles.slice(0, 4), ctrlFiles, 3));
    }
    if (svcFiles.length) {
      components.push(comp('services', 'Domain Services', 'service', 'Business Logic Layer', 'SERVICE LAYER',
        'Injectable providers containing core business logic.', 'NestJS', 90, svcFiles.slice(0, 4), svcFiles, 4));
    }
    if (guardFiles.length) {
      components.push(comp('guards', 'Security Guards', 'middleware', 'Security Layer', 'MIDDLEWARE LAYER',
        'Guards validating authentication and route authorization.', 'NestJS', 85, guardFiles.slice(0, 2), guardFiles, 2));
    }
    if (pipeFiles.length) {
      components.push(comp('pipes', 'Validation Pipes', 'transformer', 'Validation Layer', 'VALIDATION LAYER',
        'Pipes validation DTO schemas before controller execution.', 'NestJS', 85, pipeFiles.slice(0, 2), pipeFiles, 2));
    }

    const pgEvidence = getDatabaseEvidence(ctx, 'postgres');
    if (pgEvidence.length) {
      components.push(comp('data-access', 'Postgres Access Layer', 'database', 'Data Access Layer', 'DATA LAYER',
        'Access layer querying Postgres database via ORM.', 'Postgres', 90, pgEvidence.slice(0, 2), pgEvidence, 5));
    }
    const mongoEvidence = getDatabaseEvidence(ctx, 'mongodb');
    if (mongoEvidence.length) {
      components.push(comp('data-access-mongo', 'MongoDB Access Layer', 'database', 'Data Access Layer', 'DATA LAYER',
        'Access layer querying MongoDB database via model schemas.', 'MongoDB', 90, mongoEvidence.slice(0, 2), mongoEvidence, 5));
    }
    const redisEvidence = getDatabaseEvidence(ctx, 'redis');
    if (redisEvidence.length) {
      components.push(comp('cache', 'Redis Cache', 'cache', 'Cache Layer', 'CACHE LAYER',
        'Redis distributed cache storing session or route payloads.', 'Redis', 85, redisEvidence, redisEvidence, 5));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    const moduleFiles = ctx.sourceFiles.filter(f => f.toLowerCase().endsWith('.module.ts'));
    const ctrlFiles   = ctx.sourceFiles.filter(f => f.toLowerCase().endsWith('.controller.ts'));
    const svcFiles    = ctx.sourceFiles.filter(f => f.toLowerCase().endsWith('.service.ts'));

    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'modules')) {
      relationships.push(rel('bootstrap', 'modules', 'boots root module', 'Registers', 'out', 95, moduleFiles.slice(0, 1)));
    }
    if (components.find(c => c.id === 'modules') && components.find(c => c.id === 'controllers')) {
      relationships.push(rel('modules', 'controllers', 'declares routing handlers', 'Provides', 'out', 90, moduleFiles.slice(0, 2)));
    }
    if (components.find(c => c.id === 'controllers') && components.find(c => c.id === 'services')) {
      relationships.push(rel('services', 'controllers', 'injects business logic into', 'Injected Into', 'in', 92, ctrlFiles.slice(0, 2)));
    }
    
    const dbComp = components.find(c => c.id.startsWith('data-access'));
    if (components.find(c => c.id === 'services') && dbComp) {
      relationships.push(rel('services', dbComp.id, 'queries relational schemas', 'Uses', 'out', 90, svcFiles.slice(0, 2)));
    }
    const cacheComp = components.find(c => c.id === 'cache');
    if (components.find(c => c.id === 'services') && cacheComp) {
      relationships.push(rel('services', cacheComp.id, 'caches query results', 'Calls', 'out', 88, svcFiles.slice(0, 1)));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
