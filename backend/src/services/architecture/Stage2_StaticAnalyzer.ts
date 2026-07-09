/**
 * Stage 2 – Static Architecture Analyzer
 *
 * Produces an Architecture Intelligence Graph, strictly derived from verified
 * repository file index evidence.
 *
 * NO AI is involved. Every component must have verifiable evidence files.
 * If no evidence exists, the component is omitted.
 */

import path from 'path';
import { RepositoryContext } from './Stage1_ContextBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ArchitectureComponent {
  id: string;
  label: string;                  // Display title
  type: string;                   // Semantic type token
  role: string;                   // Architectural role
  layer: string;                  // Human-readable layer label
  purpose: string;                // Runtime explanation
  description: string;            // Backward compatibility description
  technology: string;
  confidence: number;             // 0–100
  evidence: string[];             // Verifiable folder/file paths
  relatedFiles: string[];         // Key files within the component
  executionOrder: number;
}

export interface ArchitectureRelationship {
  source: string;
  target: string;
  label: string;                  // Execution-flow verb
  relationshipType: 'Imports' | 'Calls' | 'Uses' | 'Injects' | 'Registers' | 'Wraps' | 'Creates' | 'Extends' | 'Implements' | 'Depends On' | 'Transforms' | 'Routes To' | 'Handles' | 'Publishes' | 'Consumes' | 'Provides' | 'Guards' | 'Injected Into';
  flowDirection: 'in' | 'out' | 'bidirectional';
  confidence: number;             // 0–100
  evidence: string[];             // Verifiable folder/file evidence
}

export interface StaticArchitectureModel {
  repositoryType: string;
  category: string;
  framework: string;
  runtime: string;
  runtimeConfidence: number;
  architecturePattern: string;
  executionFlowDescription: string;
  detectionMethod: string;
  components: ArchitectureComponent[];
  relationships: ArchitectureRelationship[];
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper queries
// ─────────────────────────────────────────────────────────────────────────────

function hasDep(deps: string[], ...names: string[]): boolean {
  return names.some(n => deps.some(d => d === n || d.startsWith(n + '@') || d.startsWith('@' + n)));
}

function keyFiles(files: string[], max = 5): string[] {
  return [...files].sort((a, b) => a.split(/[/\\]/).length - b.split(/[/\\]/).length).slice(0, max);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database & Cache Evidence Verification (Strict)
// ─────────────────────────────────────────────────────────────────────────────

export function getDatabaseEvidence(ctx: RepositoryContext, type: 'postgres' | 'mongodb' | 'mysql' | 'sqlite' | 'redis' | 'kafka' | 'rabbitmq'): string[] {
  const src = ctx.sourceFiles;
  const folders = ctx.allFolders;
  const config = ctx.configFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (type === 'postgres') {
    if (!hasDep(allDeps, 'pg', 'postgres', 'sequelize', 'typeorm', 'prisma', 'drizzle-orm')) return [];
    return src.filter(f => 
      f.toLowerCase().includes('postgres') || 
      f.toLowerCase().includes('pg.ts') || 
      f.toLowerCase().includes('pg.js') ||
      f.toLowerCase().includes('database/pg')
    ).concat(config.filter(c => c.includes('prisma') || c.includes('drizzle') || c.includes('ormconfig')));
  }

  if (type === 'mongodb') {
    if (!hasDep(allDeps, 'mongodb', 'mongoose')) return [];
    return src.filter(f => 
      f.toLowerCase().includes('mongo') || 
      f.toLowerCase().includes('mongoose') ||
      f.toLowerCase().includes('.model.ts') ||
      f.toLowerCase().includes('.model.js')
    );
  }

  if (type === 'mysql') {
    if (!hasDep(allDeps, 'mysql', 'mysql2')) return [];
    return src.filter(f => f.toLowerCase().includes('mysql') || f.toLowerCase().includes('mysql2'));
  }

  if (type === 'sqlite') {
    if (!hasDep(allDeps, 'sqlite', 'sqlite3', 'better-sqlite3')) return [];
    return src.filter(f => 
      f.toLowerCase().includes('sqlite') || 
      f.toLowerCase().endsWith('.sqlite') || 
      f.toLowerCase().endsWith('.db') || 
      f.toLowerCase().endsWith('.sqlite3')
    );
  }

  if (type === 'redis') {
    if (!hasDep(allDeps, 'redis', 'ioredis')) return [];
    return src.filter(f => 
      f.toLowerCase().includes('redis') || 
      f.toLowerCase().includes('cacheservice') || 
      f.toLowerCase().includes('cache.ts') ||
      f.toLowerCase().includes('cache.js')
    );
  }

  if (type === 'kafka') {
    if (!hasDep(allDeps, 'kafkajs', 'kafka')) return [];
    return src.filter(f => f.toLowerCase().includes('kafka'));
  }

  if (type === 'rabbitmq') {
    if (!hasDep(allDeps, 'amqplib', 'amqp')) return [];
    return src.filter(f => f.toLowerCase().includes('rabbitmq') || f.toLowerCase().includes('amqp'));
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Framework Detectors (Multi-Signal Scoring)
// ─────────────────────────────────────────────────────────────────────────────

function scoreNestJS(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  const moduleFiles = src.filter(f => f.toLowerCase().endsWith('.module.ts') || f.toLowerCase().endsWith('.module.js'));
  const controllerFiles = src.filter(f => f.toLowerCase().endsWith('.controller.ts') || f.toLowerCase().endsWith('.controller.js'));
  const serviceFiles = src.filter(f => f.toLowerCase().endsWith('.service.ts') || f.toLowerCase().endsWith('.service.js'));

  if (moduleFiles.length > 0) score += 30;
  if (controllerFiles.length > 0) score += 20;
  if (serviceFiles.length > 0) score += 10;
  if (ctx.configFiles.some(f => f.endsWith('nest-cli.json') || f.endsWith('tsconfig.build.json'))) score += 15;
  if (hasDep(allDeps, '@nestjs/core', '@nestjs/common')) score += 25;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreExpress(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (hasDep(allDeps, 'express')) score += 30;
  
  const hasRoutes = ctx.allFolders.some(f => {
    const base = path.basename(f).toLowerCase();
    return base === 'routes' || base === 'controllers' || base === 'middlewares';
  });
  if (hasRoutes) score += 20;

  const expressEntry = ctx.entryPoints.some(e => {
    const base = path.basename(e).toLowerCase();
    return ['app.js', 'server.js', 'app.ts', 'server.ts', 'index.js', 'index.ts'].includes(base);
  });
  if (expressEntry) score += 20;

  const hasRouteFiles = src.some(f => f.toLowerCase().includes('.route.ts') || f.toLowerCase().includes('.route.js') || f.toLowerCase().includes('routes/'));
  if (hasRouteFiles) score += 30;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreNextJS(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const config = ctx.configFiles;
  const folders = ctx.allFolders;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (config.some(c => c.endsWith('next.config.js') || c.endsWith('next.config.mjs') || c.endsWith('next.config.ts'))) score += 40;
  if (folders.some(f => f === 'app' || f.endsWith('/app') || f === 'pages' || f.endsWith('/pages'))) score += 40;
  if (hasDep(allDeps, 'next')) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreReact(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (hasDep(allDeps, 'react', 'react-dom')) score += 30;
  if (src.some(f => f.toLowerCase().endsWith('.tsx') || f.toLowerCase().endsWith('.jsx'))) score += 30;
  
  const hasComponentsFolder = ctx.allFolders.some(f => {
    const base = path.basename(f).toLowerCase();
    return base === 'components' || base === 'components/ui' || base === 'hooks';
  });
  if (hasComponentsFolder) score += 20;

  const hasReactRoot = src.some(f => {
    const base = path.basename(f).toLowerCase();
    return ['index.tsx', 'main.tsx', 'app.tsx', 'app.jsx'].includes(base);
  });
  if (hasReactRoot) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreVue(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (src.some(f => f.toLowerCase().endsWith('.vue'))) score += 60;
  if (hasDep(allDeps, 'vue', 'nuxt')) score += 30;
  if (ctx.configFiles.some(f => f.includes('nuxt.config') || f.includes('vue.config'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreAngular(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (ctx.configFiles.some(f => f.endsWith('angular.json'))) score += 40;
  if (hasDep(allDeps, '@angular/core', '@angular/common')) score += 40;
  if (src.some(f => f.toLowerCase().includes('.component.ts') || f.toLowerCase().includes('.module.ts'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreSpringBoot(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;

  if (ctx.configFiles.some(f => f.endsWith('pom.xml') || f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'))) score += 30;
  if (src.some(f => f.toLowerCase().endsWith('.java'))) score += 30;
  if (src.some(f => f.toLowerCase().includes('src/main/java'))) score += 20;
  if (src.some(f => f.toLowerCase().includes('application.properties') || f.toLowerCase().includes('application.yml'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreLaravel(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;

  if (ctx.configFiles.some(f => f.toLowerCase().endsWith('composer.json'))) score += 20;
  if (src.some(f => f.toLowerCase().endsWith('artisan') || f.toLowerCase().endsWith('artisan.php'))) score += 40;
  if (ctx.allFolders.some(f => f.toLowerCase().includes('app/http/controllers') || f.toLowerCase().includes('routes/web.php'))) score += 40;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreFastAPI(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;

  if (src.some(f => f.toLowerCase().endsWith('.py'))) score += 30;
  if (ctx.configFiles.some(f => f.endsWith('requirements.txt') || f.endsWith('pyproject.toml'))) score += 30;
  if (ctx.detectedImports.some(i => i === 'fastapi' || i.includes('fastapi'))) score += 40;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreCLI(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;

  if (ctx.packageJson.hasBin || ctx.packageJson.bin) score += 40;
  if (src.some(f => f.startsWith('bin/') || f.startsWith('cli/'))) score += 30;
  if (hasDep([...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies], 'commander', 'yargs', 'meow', 'argparse')) score += 30;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreMonorepo(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const config = ctx.configFiles;
  const folders = ctx.allFolders;

  if (config.some(c => c.endsWith('lerna.json') || c.endsWith('turbo.json') || c.endsWith('nx.json') || c.endsWith('pnpm-workspace.yaml'))) score += 60;
  
  const hasSubProjects = folders.some(f => f === 'packages' || f === 'apps') && 
                         folders.some(f => f.startsWith('packages/') || f.startsWith('apps/'));
  if (hasSubProjects) score += 30;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classification orchestrator (Multi-Signal)
// ─────────────────────────────────────────────────────────────────────────────
function scoreDesktop(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const config = ctx.configFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (config.some(c => c.endsWith('tauri.conf.json') || c.includes('electron-builder') || c.endsWith('wxt.config.ts'))) score += 50;
  if (hasDep(allDeps, 'electron', 'tauri', '@tauri-apps/api', 'nw')) score += 30;
  if (ctx.allFolders.some(f => f.toLowerCase().includes('src-tauri') || f.toLowerCase().includes('electron'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreMobile(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const config = ctx.configFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (config.some(c => c.endsWith('capacitor.config.json') || c.endsWith('app.json') || c.includes('Podfile'))) score += 40;
  if (hasDep(allDeps, 'react-native', 'expo', 'cordova', 'ionic')) score += 40;
  if (ctx.allFolders.some(f => f.toLowerCase().endsWith('android') || f.toLowerCase().endsWith('ios'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreInfrastructure(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const config = ctx.configFiles;

  if (config.some(c => c.endsWith('docker-compose.yml') || c.endsWith('docker-compose.yaml') || c.includes('k8s') || c.includes('kubernetes') || c.endsWith('helmfile.yaml'))) score += 40;
  if (ctx.allFolders.some(f => f.toLowerCase().includes('kubernetes') || f.toLowerCase().includes('helm') || f.toLowerCase().includes('terraform') || f.toLowerCase().includes('ansible'))) score += 40;
  if (ctx.sourceFiles.some(f => f.endsWith('.tf') || f.endsWith('.yaml') || f.endsWith('.yml'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreAIFramework(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const src = ctx.sourceFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (hasDep(allDeps, 'langchain', '@langchain/core', 'openai', 'transformers', 'tensorflow', 'pytorch')) score += 40;
  if (ctx.detectedImports.some(i => ['langchain', 'openai', 'tensorflow', 'torch', 'transformers'].includes(i))) score += 40;
  if (src.some(f => f.toLowerCase().includes('agent') || f.toLowerCase().includes('chain') || f.toLowerCase().includes('prompt'))) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

function scoreSDK(ctx: RepositoryContext): { match: boolean; confidence: number } {
  let score = 0;
  const name = ctx.name.toLowerCase();
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];

  if (name.includes('sdk') || name.includes('-client') || name.includes('api-client')) score += 40;
  if (ctx.sourceFiles.some(f => f.toLowerCase().includes('sdk.ts') || f.toLowerCase().includes('sdk.js') || f.toLowerCase().includes('client.ts'))) score += 40;
  if (hasDep(allDeps, 'axios', 'node-fetch', 'got') && name.includes('api')) score += 20;

  return { match: score >= 50, confidence: Math.min(100, score) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classification orchestrator (Multi-Signal Multi-Stage Classifier)
// ─────────────────────────────────────────────────────────────────────────────
function classifyRepository(ctx: RepositoryContext): { type: string; category: string; framework: string; architecturePattern: string; confidence: number } {
  // Stage 1: Kind Detection
  let kind = 'Library';
  let kindConfidence = 80;

  const config = ctx.configFiles;
  const allDeps = ctx.packageJson.dependencies;
  const src = ctx.sourceFiles;
  const folders = ctx.allFolders;
  const name = ctx.name.toLowerCase();

  const isMonorepo = scoreMonorepo(ctx);
  const isCLI = scoreCLI(ctx);
  const isDesktop = scoreDesktop(ctx);
  const isMobile = scoreMobile(ctx);
  const isInfrastructure = scoreInfrastructure(ctx);
  const isAIFramework = scoreAIFramework(ctx);
  const isSDK = scoreSDK(ctx);

  if (isMonorepo.match) {
    kind = 'Monorepo';
    kindConfidence = isMonorepo.confidence;
  } else if (isInfrastructure.match) {
    kind = 'Infrastructure';
    kindConfidence = isInfrastructure.confidence;
  } else if (isAIFramework.match) {
    kind = 'AI Framework';
    kindConfidence = isAIFramework.confidence;
  } else if (isDesktop.match) {
    kind = 'Desktop';
    kindConfidence = isDesktop.confidence;
  } else if (isMobile.match) {
    kind = 'Mobile';
    kindConfidence = isMobile.confidence;
  } else if (isCLI.match) {
    kind = 'CLI';
    kindConfidence = isCLI.confidence;
  } else if (isSDK.match) {
    kind = 'SDK';
    kindConfidence = isSDK.confidence;
  } else {
    const hasNext = scoreNextJS(ctx);
    const hasReact = scoreReact(ctx);
    const hasVue = scoreVue(ctx);
    const hasAngular = scoreAngular(ctx);
    const hasNest = scoreNestJS(ctx);
    const hasExpress = scoreExpress(ctx);
    const hasFastAPI = scoreFastAPI(ctx);
    const hasSpring = scoreSpringBoot(ctx);
    const hasLaravel = scoreLaravel(ctx);

    const matchedFramework = [hasNext, hasReact, hasVue, hasAngular, hasNest, hasExpress, hasFastAPI, hasSpring, hasLaravel].some(f => f.match);

    if (matchedFramework) {
      const isFrontend = [hasReact, hasVue, hasAngular].some(f => f.match) && ![hasNest, hasExpress, hasFastAPI, hasSpring, hasLaravel].some(f => f.match);
      if (isFrontend) {
        kind = 'Frontend Application';
        kindConfidence = Math.max(hasReact.confidence, hasVue.confidence, hasAngular.confidence);
      } else {
        if (hasNext.match) {
          kind = 'Framework';
          kindConfidence = hasNext.confidence;
        } else {
          kind = 'Backend API';
          kindConfidence = Math.max(hasNest.confidence, hasExpress.confidence, hasFastAPI.confidence, hasSpring.confidence, hasLaravel.confidence);
        }
      }
    } else {
      kind = 'Library';
      kindConfidence = 80;
    }
  }

  // Stage 2: Framework Detection
  let framework = 'None';
  let frameworkConfidence = 100;

  if (kind === 'Framework' || kind === 'Backend API' || kind === 'Frontend Application') {
    const nestRes = scoreNestJS(ctx);
    const nextRes = scoreNextJS(ctx);
    const reactRes = scoreReact(ctx);
    const expressRes = scoreExpress(ctx);
    const vueRes = scoreVue(ctx);
    const angularRes = scoreAngular(ctx);
    const springRes = scoreSpringBoot(ctx);
    const laravelRes = scoreLaravel(ctx);
    const fastapiRes = scoreFastAPI(ctx);

    const matches = [
      { name: 'NestJS', res: nestRes },
      { name: 'Next.js', res: nextRes },
      { name: 'React', res: reactRes },
      { name: 'Express', res: expressRes },
      { name: 'Vue.js', res: vueRes },
      { name: 'Angular', res: angularRes },
      { name: 'Spring Boot', res: springRes },
      { name: 'Laravel', res: laravelRes },
      { name: 'FastAPI', res: fastapiRes }
    ].filter(m => m.res.match);

    if (matches.length > 0) {
      matches.sort((a, b) => b.res.confidence - a.res.confidence);
      framework = matches[0].name;
      frameworkConfidence = matches[0].res.confidence;
    }
  }

  // Stage 3: Architecture Pattern
  let pattern = 'Layered Library';
  if (framework === 'Express') pattern = 'Middleware Pipeline';
  else if (framework === 'NestJS') pattern = 'Modular Dependency Injection';
  else if (framework === 'FastAPI') pattern = 'Layered API';
  else if (framework === 'React' || framework === 'Vue.js' || framework === 'Angular') pattern = 'Component Tree';
  else if (framework === 'Next.js') pattern = 'Hybrid SSR Framework';
  else if (kind === 'Library') {
    if (folders.some(f => f.toLowerCase().includes('adapter')) || src.some(f => f.toLowerCase().includes('/adapters/'))) {
      pattern = 'Adapter Pattern';
    } else {
      pattern = 'Layered Library';
    }
  } else if (kind === 'CLI') {
    pattern = 'Command Architecture';
  } else if (kind === 'Monorepo') {
    pattern = 'Workspace Architecture';
  }

  // Map Kind to Category
  let category = 'Software Package';
  if (name.includes('axios')) {
    category = 'HTTP Client Library';
  } else {
    if (kind === 'Library') category = 'Library';
    else if (kind === 'Backend API') category = 'Backend API';
    else if (kind === 'Frontend Application') category = 'Frontend Application';
    else if (kind === 'CLI') category = 'CLI';
    else if (kind === 'SDK') category = 'SDK';
    else if (kind === 'Desktop') category = 'Desktop';
    else if (kind === 'Mobile') category = 'Mobile';
    else if (kind === 'Monorepo') category = 'Monorepo';
    else if (kind === 'Infrastructure') category = 'Infrastructure';
    else if (kind === 'AI Framework') category = 'AI Framework';
    else if (kind === 'Framework') category = 'Framework';
  }

  // Primary language detection helper
  const primaryLanguage = ctx.languages[0] || 'JavaScript';

  // Map Kind to Type
  let type = 'JavaScript Library';
  if (kind === 'Monorepo') type = 'Monorepo';
  else if (kind === 'Infrastructure') type = 'Infrastructure Code';
  else if (kind === 'CLI') type = 'CLI Tool';
  else if (kind === 'SDK') type = 'SDK Library';
  else if (framework !== 'None') type = `${framework} Application`;
  else if (primaryLanguage === 'Python') type = 'Python Library';
  else if (primaryLanguage === 'Go') type = 'Go Library';

  return {
    type,
    category,
    framework,
    architecturePattern: pattern,
    confidence: Math.round((kindConfidence + frameworkConfidence) / 2)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Factory
// ─────────────────────────────────────────────────────────────────────────────
export function rel(
  source: string,
  target: string,
  label: string,
  relationshipType: ArchitectureRelationship['relationshipType'] = 'Calls',
  flowDirection: ArchitectureRelationship['flowDirection'] = 'out',
  confidence = 90,
  evidence: string[] = []
): ArchitectureRelationship {
  return { source, target, label, relationshipType, flowDirection, confidence, evidence };
}

export function comp(
  id: string,
  label: string,
  type: string,
  role: string,
  layer: string,
  purpose: string,
  technology: string,
  confidence: number,
  evidence: string[],
  relatedFiles: string[],
  executionOrder: number
): ArchitectureComponent {
  return {
    id, label, type, role, layer, purpose, technology,
    description: purpose,
    confidence, evidence,
    relatedFiles: keyFiles(relatedFiles),
    executionOrder
  };
}

function foldersContain(folders: string[], name: string): boolean {
  return folders.some(f => path.basename(f).toLowerCase() === name.toLowerCase());
}

function detectRuntime(ctx: RepositoryContext, type: string, category: string): { runtime: string; confidence: number } {
  const config = ctx.configFiles;
  const allDeps = [...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies];
  const src = ctx.sourceFiles;
  const folders = ctx.allFolders;

  // 1. Flutter
  if (config.some(c => c.endsWith('pubspec.yaml')) || folders.some(f => f.toLowerCase() === 'lib' && src.some(s => s.endsWith('.dart')))) {
    return { runtime: 'Flutter', confidence: 95 };
  }

  // 2. React Native
  if (hasDep(allDeps, 'react-native', 'expo')) {
    return { runtime: 'React Native', confidence: 95 };
  }

  // 3. Electron
  if (hasDep(allDeps, 'electron') || config.some(c => c.includes('electron-builder') || c.includes('electron.json'))) {
    return { runtime: 'Electron', confidence: 95 };
  }

  // 4. Browser + Node.js (Fullstack Javascript: Next.js, Nuxt.js, SvelteKit, Astro)
  if (type.includes('Next.js') || type.includes('Nuxt') || type.includes('SvelteKit') || type.includes('Astro')) {
    return { runtime: 'Browser + Node.js', confidence: 95 };
  }

  // 5. Browser (pure frontend JS/TS apps without backend)
  if (category === 'Frontend Application' || type.includes('React') || type.includes('Vue') || type.includes('Angular')) {
    return { runtime: 'Browser', confidence: 90 };
  }

  // 6. Node.js (express, nest, packages)
  if (type.includes('Express') || type.includes('NestJS') || config.some(c => c.endsWith('package.json') || c.endsWith('tsconfig.json'))) {
    const isFrontendOnly = category === 'Frontend Application';
    if (!isFrontendOnly) {
      return { runtime: 'Node.js', confidence: 90 };
    }
  }

  // 7. Python
  if (src.some(f => f.endsWith('.py')) || config.some(c => c.endsWith('requirements.txt') || c.endsWith('pyproject.toml') || c.endsWith('Pipfile'))) {
    return { runtime: 'Python', confidence: 95 };
  }

  // 8. Java
  if (src.some(f => f.endsWith('.java')) || config.some(c => c.endsWith('pom.xml') || c.endsWith('build.gradle') || c.endsWith('build.gradle.kts'))) {
    return { runtime: 'Java', confidence: 95 };
  }

  // 9. Go
  if (config.some(c => c.endsWith('go.mod')) || src.some(f => f.endsWith('.go'))) {
    return { runtime: 'Go', confidence: 95 };
  }

  // 10. Rust
  if (config.some(c => c.endsWith('Cargo.toml')) || src.some(f => f.endsWith('.rs'))) {
    return { runtime: 'Rust', confidence: 95 };
  }

  // 11. PHP
  if (config.some(c => c.endsWith('composer.json')) || src.some(f => f.endsWith('.php'))) {
    return { runtime: 'PHP', confidence: 95 };
  }

  // 12. .NET (C#)
  if (config.some(c => c.endsWith('.csproj') || c.endsWith('.sln')) || src.some(f => f.endsWith('.cs'))) {
    return { runtime: '.NET', confidence: 95 };
  }

  return { runtime: 'Unknown', confidence: 50 };
}

export class Stage2_StaticAnalyzer {
  static analyze(ctx: RepositoryContext): StaticArchitectureModel {
    const classification = classifyRepository(ctx);
    const rtInfo = detectRuntime(ctx, classification.type, classification.category);

    const tempProfile = {
      name: ctx.name,
      repositoryType: classification.type,
      category: classification.category,
      framework: classification.framework,
      primaryLanguage: ctx.languages[0] || 'Unknown',
      runtime: rtInfo.runtime,
      confidence: classification.confidence
    };

    const { AnalyzerRegistry } = require('./AnalyzerRegistry');
    const analyzer = AnalyzerRegistry.getAnalyzerForProfile(tempProfile);

    const rawComponents = analyzer.extractComponents(ctx);
    const rawRelationships = analyzer.extractRelationships(ctx, rawComponents);

    // Filter components ensuring EVERY component has at least one evidence file/folder path
    const safeComponents = rawComponents.filter((c: any) => c.evidence.length > 0);
    const ids = new Set(safeComponents.map((c: any) => c.id));
    const safeRelations = rawRelationships.filter((r: any) => ids.has(r.source) && ids.has(r.target));

    safeComponents.sort((a: any, b: any) => a.executionOrder - b.executionOrder);

    const finalConfidence = analyzer.calculateConfidence(tempProfile, safeComponents);

    // Map Kind to Architecture Pattern
    let pattern = 'Layered Library';
    if (classification.framework === 'Express') pattern = 'Middleware Pipeline';
    else if (classification.framework === 'NestJS') pattern = 'Modular Dependency Injection';
    else if (classification.framework === 'FastAPI') pattern = 'Layered API';
    else if (classification.framework === 'React' || classification.framework === 'Vue.js' || classification.framework === 'Angular') pattern = 'Component Tree';
    else if (classification.framework === 'Next.js') pattern = 'Hybrid SSR Framework';
    else if (classification.category === 'Library') {
      if (ctx.allFolders.some(f => f.toLowerCase().includes('adapter')) || ctx.sourceFiles.some(f => f.toLowerCase().includes('/adapters/'))) {
        pattern = 'Adapter Pattern';
      } else {
        pattern = 'Layered Library';
      }
    } else if (classification.category === 'CLI') {
      pattern = 'Command Architecture';
    } else if (classification.category === 'Monorepo') {
      pattern = 'Workspace Architecture';
    }

    return {
      repositoryType: classification.type,
      category: classification.category,
      framework: classification.framework,
      runtime: rtInfo.runtime,
      runtimeConfidence: rtInfo.confidence,
      architecturePattern: pattern,
      executionFlowDescription: `Request Flow via ${analyzer.name} engine`,
      detectionMethod: 'Multi-Signal Heuristic Analysis (Strict Evidence)',
      components: safeComponents,
      relationships: safeRelations,
      confidence: finalConfidence
    };
  }
}
