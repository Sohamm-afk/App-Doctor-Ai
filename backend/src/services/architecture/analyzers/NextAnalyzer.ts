import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class NextAnalyzer implements IRepositoryAnalyzer {
  name = 'Next.js';

  supports(profile: any): boolean {
    return profile.framework === 'Next.js';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { allFolders, sourceFiles } = ctx;

    const { comp } = require('../Stage2_StaticAnalyzer');

    const appFolder = allFolders.filter(f => f === 'app' || f.endsWith('/app'));
    const pagesFolder = allFolders.filter(f => f === 'pages' || f.endsWith('/pages'));
    const middlewareFile = sourceFiles.filter(f => f.endsWith('middleware.ts') || f.endsWith('middleware.js'));
    const apiFiles = sourceFiles.filter(f => f.includes('pages/api/') || f.includes('app/api/'));

    const isAppRouter = appFolder.length > 0;

    if (isAppRouter) {
      components.push(comp('router', 'App Router Routing', 'router', 'Routing Layer', 'ROUTING LAYER',
        'File-system app routing with React Server Components.', 'Next.js App Router', 95, appFolder, appFolder, 0));
    } else {
      components.push(comp('router', 'Pages Router Routing', 'router', 'Routing Layer', 'ROUTING LAYER',
        'File-system page mapping with client routing.', 'Next.js Pages Router', 95, pagesFolder.length ? pagesFolder : ['pages'], pagesFolder, 0));
    }

    if (middlewareFile.length) {
      components.push(comp('middleware', 'Edge Middleware', 'middleware', 'Edge Middleware', 'MIDDLEWARE LAYER',
        'Request filtering running on edge workers.', 'Next.js Edge', 90, middlewareFile, middlewareFile, 0));
    }

    if (apiFiles.length) {
      components.push(comp('api', 'API Handlers', 'service', 'API Layer', 'API LAYER',
        'Serverless route handlers providing backend APIs.', 'Next.js Serverless', 90, apiFiles.slice(0, 3), apiFiles, 2));
    }

    const compFiles = sourceFiles.filter(f => f.toLowerCase().includes('/components/'));
    if (compFiles.length) {
      components.push(comp('components', 'React UI Components', 'component', 'Component Layer', 'COMPONENT LAYER',
        'Presentation components hydating client-side UI.', 'React', 90, compFiles.slice(0, 3), compFiles, 3));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    if (components.find(c => c.id === 'middleware') && components.find(c => c.id === 'router')) {
      relationships.push(rel('middleware', 'router', 'guards routing to', 'guards'));
    }
    if (components.find(c => c.id === 'router') && components.find(c => c.id === 'components')) {
      relationships.push(rel('router', 'components', 'renders', 'routes-to'));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
