import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class ExpressAnalyzer implements IRepositoryAnalyzer {
  name = 'Express';

  supports(profile: any): boolean {
    return profile.framework === 'Express';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { sourceFiles, allFolders } = ctx;

    const { comp, getDatabaseEvidence } = require('../Stage2_StaticAnalyzer');

    const routeFiles = sourceFiles.filter(f => f.toLowerCase().includes('route') || f.toLowerCase().includes('/routes/'));
    const controllerFiles = sourceFiles.filter(f => f.toLowerCase().includes('controller') || f.toLowerCase().includes('/controllers/'));
    const middlewareFiles = sourceFiles.filter(f => f.toLowerCase().includes('middleware') || f.toLowerCase().includes('/middlewares/') || f.toLowerCase().includes('/middleware/'));
    const serviceFiles = sourceFiles.filter(f => f.toLowerCase().includes('service') || f.toLowerCase().includes('/services/'));

    const entryPoints = ctx.entryPoints.filter(e => {
      const base = path.basename(e).toLowerCase();
      return ['app.js', 'server.js', 'app.ts', 'server.ts', 'index.js', 'index.ts'].includes(base);
    });

    if (entryPoints.length) {
      components.push(comp('bootstrap', 'Express Server Bootstrap', 'entry', 'Application Entry', 'ENTRY LAYER',
        'Bootstraps Express HTTP listener, registers routes, and plugs in middleware.', 'Express', 95, entryPoints, entryPoints, 0));
    }
    if (routeFiles.length) {
      components.push(comp('routes', 'Express Routers', 'router', 'Request Router', 'ROUTING LAYER',
        'Express router definitions mapping HTTP paths to handlers.', 'Express', 90, routeFiles.slice(0, 4), routeFiles, 1));
    }
    if (controllerFiles.length) {
      components.push(comp('controllers', 'HTTP Handlers', 'controller', 'Request Handlers', 'CONTROLLER LAYER',
        'Route handler controllers parsing inputs and invoking services.', 'Express', 90, controllerFiles.slice(0, 4), controllerFiles, 3));
    }
    if (middlewareFiles.length) {
      components.push(comp('middleware', 'Express Middleware', 'middleware', 'Middleware Interceptors', 'MIDDLEWARE LAYER',
        'Express request interceptors performing auth, validation, or logging.', 'Express', 85, middlewareFiles.slice(0, 2), middlewareFiles, 2));
    }
    if (serviceFiles.length) {
      components.push(comp('services', 'Logic Providers', 'service', 'Business Logic', 'SERVICE LAYER',
        'Internal service providers encapsulating core domain operations.', 'JavaScript/TypeScript', 85, serviceFiles.slice(0, 4), serviceFiles, 4));
    }

    const pgEvidence = getDatabaseEvidence(ctx, 'postgres');
    if (pgEvidence.length) {
      components.push(comp('data-access', 'Postgres Access Layer', 'database', 'Data Access Layer', 'DATA LAYER',
        'Queries Postgres database via ORM.', 'Postgres', 90, pgEvidence.slice(0, 2), pgEvidence, 5));
    }
    const mongoEvidence = getDatabaseEvidence(ctx, 'mongodb');
    if (mongoEvidence.length) {
      components.push(comp('data-access-mongo', 'MongoDB Access Layer', 'database', 'Data Access Layer', 'DATA LAYER',
        'Queries MongoDB database via model schemas.', 'MongoDB', 90, mongoEvidence.slice(0, 2), mongoEvidence, 5));
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

    const routeFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('route') || f.toLowerCase().includes('/routes/'));
    const controllerFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('controller') || f.toLowerCase().includes('/controllers/'));
    const middlewareFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('middleware') || f.toLowerCase().includes('/middlewares/') || f.toLowerCase().includes('/middleware/'));

    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'middleware')) {
      relationships.push(rel('bootstrap', 'middleware', 'mounts security hooks', 'Registers', 'out', 92, middlewareFiles.slice(0, 1)));
    }
    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'routes')) {
      relationships.push(rel('bootstrap', 'routes', 'registers api router endpoints', 'Registers', 'out', 95, routeFiles.slice(0, 1)));
    }
    if (components.find(c => c.id === 'routes') && components.find(c => c.id === 'controllers')) {
      relationships.push(rel('routes', 'controllers', 'forwards path matches to', 'Handles', 'out', 90, routeFiles.slice(0, 2)));
    }
    if (components.find(c => c.id === 'controllers') && components.find(c => c.id === 'services')) {
      relationships.push(rel('controllers', 'services', 'delegates service tasks', 'Calls', 'out', 88, controllerFiles.slice(0, 2)));
    }

    const dbComp = components.find(c => c.id.startsWith('data-access'));
    if (components.find(c => c.id === 'services') && dbComp) {
      relationships.push(rel('services', dbComp.id, 'reads/writes states', 'Uses', 'out', 90, dbComp.evidence.slice(0, 1)));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
