/**
 * Stage 1 – Repository Context Builder
 *
 * Extracts every piece of verifiable evidence from the raw scan result and
 * technology info.  No AI is involved here – only file system facts.
 */

import path from 'path';
import { ScanResult, TechnologyInfo } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Output type
// ─────────────────────────────────────────────────────────────────────────────
export interface PackageJsonInfo {
  name: string;
  description: string;
  main: string;
  module: string;
  browser: string;
  bin: Record<string, string>;
  scripts: string[];          // script names only (not values)
  keywords: string[];
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
  hasTypes: boolean;
  isPrivate: boolean;
  hasBin: boolean;
  hasMain: boolean;
  hasModule: boolean;
  hasBrowser: boolean;
}

export interface RepositoryContext {
  name: string;
  packageManager: string;
  languages: string[];

  packageJson: PackageJsonInfo;

  // File-system evidence
  topLevelFolders: string[];   // immediate children of root that are directories
  allFolders: string[];        // every directory, excluding noise
  sourceFiles: string[];       // .ts/.js/.tsx/.jsx/.py/.go etc.
  configFiles: string[];       // build/bundler/framework config files
  entryPoints: string[];       // known entry-point paths
  testFiles: string[];
  deploymentFiles: string[];

  // Dependency evidence
  detectedImports: string[];   // external package names imported by the repo

  // Stats
  stats: {
    totalFiles: number;
    totalFolders: number;
    maxDepth: number;
    byExtension: Record<string, number>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const NOISE_DIRS = ['node_modules', '.git', 'dist', 'build', '.cache',
  'coverage', '.next', '.nuxt', '.svelte-kit', '__pycache__', '.venv',
  'venv', 'target', '.gradle'];

function isNoise(p: string): boolean {
  const lower = p.toLowerCase();
  return NOISE_DIRS.some(d => lower.includes(d + '/') || lower.includes(d + '\\') || lower === d);
}

function files(repoIndex: any[], exts: string[], max = 200): string[] {
  return repoIndex
    .filter(f => !f.isDirectory && !isNoise(f.relativePath))
    .filter(f => exts.some(e => f.relativePath.toLowerCase().endsWith(e)))
    .map(f => f.relativePath)
    .slice(0, max);
}

function cleanFolders(repoIndex: any[], max = 150): string[] {
  return repoIndex
    .filter(f => f.isDirectory && !isNoise(f.relativePath))
    .map(f => f.relativePath)
    .slice(0, max);
}

function topLevel(allFolders: string[]): string[] {
  return [...new Set(
    allFolders.filter(f => !f.includes('/') && !f.includes('\\'))
  )];
}

function inferEntryPoints(repoIndex: any[], packageMain: string): string[] {
  const candidates = [
    packageMain,
    'index.js', 'index.ts', 'index.mjs',
    'src/index.js', 'src/index.ts', 'src/index.mjs',
    'lib/index.js', 'lib/index.ts',
    'app.js', 'app.ts', 'main.js', 'main.ts',
    'server.js', 'server.ts',
    'cli.js', 'cli.ts',
    'bin/index.js', 'bin/cli.js'
  ].filter(Boolean);

  return [...new Set(
    candidates.filter(c =>
      repoIndex.some((f: any) =>
        !f.isDirectory && (f.relativePath === c || f.relativePath.endsWith('/' + c))
      )
    )
  )].slice(0, 8);
}

function inferPackageManager(repoIndex: any[]): string {
  const r = (p: string) => repoIndex.some((f: any) => f.relativePath === p);
  if (r('bun.lockb'))          return 'bun';
  if (r('pnpm-lock.yaml'))     return 'pnpm';
  if (r('yarn.lock'))          return 'yarn';
  if (r('package-lock.json'))  return 'npm';
  if (r('pom.xml'))            return 'maven';
  if (r('build.gradle'))       return 'gradle';
  if (r('requirements.txt') || r('pyproject.toml')) return 'pip';
  if (r('go.mod'))             return 'go modules';
  if (r('Cargo.toml'))         return 'cargo';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 public API
// ─────────────────────────────────────────────────────────────────────────────
export class Stage1_ContextBuilder {
  static build(
    repoName: string,
    scanResult: ScanResult,
    technologyInfo: TechnologyInfo
  ): RepositoryContext {
    const repoIndex = scanResult.repoIndex || [];

    const allFolders  = cleanFolders(repoIndex);
    const topLevelFolders = topLevel(allFolders);

    const sourceFiles = files(repoIndex, [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
      '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.cpp', '.c', '.swift', '.kt'
    ], 200);

    const configFiles = files(repoIndex, [
      'package.json', 'tsconfig.json', 'tsconfig.build.json',
      '.babelrc', 'babel.config.js', 'babel.config.ts',
      'vite.config.ts', 'vite.config.js',
      'rollup.config.js', 'rollup.config.ts', 'rollup.config.mjs',
      'webpack.config.js', 'webpack.config.ts',
      'esbuild.config.js', 'esbuild.config.mjs',
      'next.config.js', 'next.config.ts', 'next.config.mjs',
      'nuxt.config.js', 'nuxt.config.ts',
      'svelte.config.js', 'astro.config.js', 'astro.config.ts',
      'jest.config.js', 'jest.config.ts', 'vitest.config.ts', 'vitest.config.js',
      'tailwind.config.js', 'tailwind.config.ts',
      'go.mod', 'go.sum',
      'Cargo.toml', 'Cargo.lock',
      'pom.xml', 'build.gradle',
      'requirements.txt', 'pyproject.toml', 'setup.py',
      'Makefile', 'CMakeLists.txt',
      '.env', '.env.example',
      'lerna.json', 'turbo.json', 'nx.json', 'pnpm-workspace.yaml'
    ], 40);

    const testFiles = files(repoIndex, [
      '.spec.ts', '.spec.js', '.spec.tsx', '.spec.jsx',
      '.test.ts', '.test.js', '.test.tsx', '.test.jsx',
      '_test.go', '_test.py'
    ], 40);

    const deploymentFiles = files(repoIndex, [
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      'vercel.json', 'netlify.toml', '.travis.yml', 'appspec.yml',
      'Jenkinsfile', '.github', 'azure-pipelines.yml'
    ], 20);

    // Build package.json info from TechnologyInfo (we don't have the raw file)
    const rawDeps    = Array.isArray(technologyInfo.dependencies)    ? technologyInfo.dependencies    : [];
    const rawDevDeps = Array.isArray(technologyInfo.devDependencies) ? technologyInfo.devDependencies : [];
    const rawImports = Array.isArray(technologyInfo.imports)         ? technologyInfo.imports         : [];

    const packageJson: PackageJsonInfo = {
      name:           repoName,
      description:    '',
      main:           '',
      module:         '',
      browser:        '',
      bin:            {},
      scripts:        [],
      keywords:       [],
      dependencies:   rawDeps.slice(0, 100),
      devDependencies: rawDevDeps.slice(0, 80),
      peerDependencies: [],
      hasTypes:       rawDevDeps.some(d => d.startsWith('@types/') || d === 'typescript'),
      isPrivate:      false,
      hasBin:         false,
      hasMain:        rawDeps.length === 0 && allFolders.some(f => f === 'lib' || f === 'src'),
      hasModule:      configFiles.some(c => c.includes('rollup') || c.includes('vite') || c.includes('esbuild')),
      hasBrowser:     rawImports.some(i => i === 'axios' || rawDeps.some(d => d === 'axios')),
    };

    // Detect bin presence from repoIndex
    packageJson.hasBin = repoIndex.some((f: any) => f.relativePath.startsWith('bin/') && !f.isDirectory);

    const entryPoints = inferEntryPoints(repoIndex, packageJson.main);

    return {
      name:             repoName,
      packageManager:   inferPackageManager(repoIndex),
      languages:        (technologyInfo.languages || []).slice(0, 10),
      packageJson,
      topLevelFolders,
      allFolders,
      sourceFiles,
      configFiles,
      entryPoints,
      testFiles,
      deploymentFiles,
      detectedImports:  [...new Set(rawImports)].slice(0, 100),
      stats: {
        totalFiles:   scanResult.fileCount  || 0,
        totalFolders: scanResult.folderCount || 0,
        maxDepth:     scanResult.maxDepth    || 0,
        byExtension:  scanResult.extensions  || {}
      }
    };
  }
}
