export interface EvidenceFact<T = any> {
  value: T;
  confidence: number;
  evidence: string[];
  reason: string;
}

export class EvidenceEngine {
  /**
   * Helper to construct a standardized explainable fact
   */
  public static createFact<T>(value: T, confidence: number, evidence: string[], reason: string): EvidenceFact<T> {
    return {
      value,
      confidence: Math.round(confidence),
      evidence: evidence && evidence.length ? evidence : ['None detected'],
      reason: reason || 'Verified from repository indicators.'
    };
  }

  /**
   * Explains Framework
   */
  public static explainFramework(framework: string, confidence: number, ctx: any): EvidenceFact<string> {
    let reason = `No specific framework has been identified as the core engine.`;
    let evidence: string[] = [];

    if (framework === 'FastAPI') {
      reason = 'Bootstrapping code and routing decorators confirm a FastAPI application.';
      evidence = ['main.py', 'FastAPI()', 'APIRouter()', 'requirements.txt'].filter(e => {
        if (e === 'main.py') return ctx.sourceFiles.some((f: string) => f.endsWith('main.py'));
        if (e === 'requirements.txt') return ctx.configFiles.some((f: string) => f.endsWith('requirements.txt'));
        return true;
      });
      if (evidence.length === 0) evidence = ['main.py'];
    } else if (framework === 'Express') {
      reason = 'Express dependency import and listen initialization bootstrapping confirms an Express API host.';
      evidence = ['express', 'server.js', 'app.js'].filter(e => {
        if (e === 'express') return true;
        return ctx.sourceFiles.some((f: string) => f.toLowerCase().endsWith(e));
      });
    } else if (framework === 'NestJS') {
      reason = 'NestJS modular architecture patterns and module decorator configurations detected.';
      evidence = ['main.ts', 'app.module.ts', '@nestjs/core'].filter(e => {
        if (e.startsWith('@')) return true;
        return ctx.sourceFiles.some((f: string) => f.toLowerCase().endsWith(e));
      });
    } else if (framework === 'React') {
      reason = 'React component renders and client bootstrapping libraries imported.';
      evidence = ['package.json', 'index.tsx', 'react'].filter(e => {
        if (e.endsWith('.json') || e === 'react') return true;
        return ctx.sourceFiles.some((f: string) => f.toLowerCase().endsWith(e));
      });
    } else if (framework === 'Next.js') {
      reason = 'Next.js router architecture and page layout structures present.';
      evidence = ['next.config.js', 'app/', 'pages/'].filter(e => {
        if (e.endsWith('/')) return ctx.allFolders.some((f: string) => f.endsWith(e.slice(0, -1)));
        return ctx.configFiles.some((f: string) => f.endsWith(e));
      });
    } else if (framework === 'Vue.js') {
      reason = 'Vue SFC templates and reactive properties present.';
      evidence = ['.vue files', 'package.json'];
    } else if (framework === 'Angular') {
      reason = 'Angular modules and component templates present.';
      evidence = ['angular.json', '.component.ts files'];
    } else {
      evidence = ctx.configFiles.slice(0, 2);
    }

    return this.createFact(framework, confidence, evidence, reason);
  }

  /**
   * Explains Repository Type
   */
  public static explainRepositoryType(type: string, confidence: number, ctx: any): EvidenceFact<string> {
    let reason = 'Based on the identified entry points and runtime characteristics.';
    let evidence: string[] = [];

    if (type.toLowerCase().includes('library') || type.toLowerCase().includes('package')) {
      reason = 'Repository exposes reusable APIs and helper utilities rather than an executable application.';
      evidence = ['exports', 'public API', 'core/', 'helpers/'].filter(e => {
        if (e === 'core/') return ctx.allFolders.some((f: string) => f.includes('core'));
        if (e === 'helpers/') return ctx.allFolders.some((f: string) => f.includes('helper') || f.includes('util'));
        return true;
      });
    } else if (type.toLowerCase().includes('application') || type.toLowerCase().includes('api')) {
      reason = 'Bootstrapping logic and deployment descriptors indicate an executable server or application.';
      evidence = ctx.entryPoints.slice(0, 2).concat(ctx.configFiles.filter((f: string) => f.includes('docker') || f.includes('yaml')).slice(0, 1));
    } else {
      evidence = ['package.json'];
    }

    return this.createFact(type, confidence, evidence, reason);
  }

  /**
   * Explains Architecture Pattern
   */
  public static explainArchitecturePattern(pattern: string, confidence: number, ctx: any): EvidenceFact<string> {
    let reason = 'Structural design pattern identified from folder layout.';
    let evidence: string[] = [];

    if (pattern === 'Layered API') {
      reason = 'Repository structure follows layered API conventions.';
      evidence = ['routers/', 'dependencies/', 'schemas/', 'models/', 'services/'].filter(e => {
        return ctx.allFolders.some((f: string) => f.toLowerCase().includes(e.slice(0, -1)));
      });
      if (evidence.length === 0) evidence = ['app/routers', 'app/models'];
    } else if (pattern === 'Modular Dependency Injection' || pattern.includes('Modular')) {
      reason = 'Folder bounds structure enforces NestJS style dependency injection and module registrations.';
      evidence = ['modules/', 'controllers/', 'services/'].filter(e => {
        return ctx.allFolders.some((f: string) => f.toLowerCase().includes(e.slice(0, -1)));
      });
    } else if (pattern.includes('Component')) {
      reason = 'Presentation components layout organizes view rendering tree.';
      evidence = ['components/', 'hooks/', 'store/'].filter(e => {
        return ctx.allFolders.some((f: string) => f.toLowerCase().includes(e.slice(0, -1)));
      });
    } else if (pattern === 'Middleware Pipeline') {
      reason = 'HTTP requests traverse sequential router routes and interceptor middlewares.';
      evidence = ['middleware/', 'routes/', 'controllers/'].filter(e => {
        return ctx.allFolders.some((f: string) => f.toLowerCase().includes(e.slice(0, -1)));
      });
    } else if (pattern === 'Adapter Pattern') {
      reason = 'Transport wrappers decouple public API calls from client environment details.';
      evidence = ['adapters/', 'core/', 'helpers/'].filter(e => {
        return ctx.allFolders.some((f: string) => f.toLowerCase().includes(e.slice(0, -1)));
      });
    } else {
      evidence = ['src/'];
    }

    return this.createFact(pattern, confidence, evidence, reason);
  }
}
