import fs from 'fs';
import path from 'path';
import { ScanResult, IndexedFile } from '../types';

const IMPORTANT_FILE_NAMES = [
  'README.md',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'poetry.lock',
  'Pipfile',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.gitignore',
  '.env.example',
  '.env.template',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.js',
  'tsconfig.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Cargo.toml',
  'Cargo.lock',
  'composer.json',
  'composer.lock',
  'go.mod',
  'go.sum',
  'Gemfile',
  'Gemfile.lock',
  'svelte.config.js',
  'serverless.yml',
  'serverless.yaml',
  'turbo.json',
  'nx.json',
  'pnpm-workspace.yaml'
];

export class ScannerService {
  /**
   * Recursively scans directory to compile folder structure metrics, detect important files,
   * and build a reusable Repository Index. Handles timeout limits for large codebases.
   */
  public static async scanRepository(repoPath: string, fastScan: boolean = false): Promise<ScanResult> {
    const extensions: Record<string, number> = {};
    const largestFiles: { path: string; size: number }[] = [];
    const importantFiles: string[] = [];
    const repoIndex: IndexedFile[] = [];
    
    let fileCount = 0;
    let folderCount = 0;
    let totalSize = 0;
    let maxDepth = 0;

    let pmDetected = false;
    let cicdDetected = false;
    let frameworkDetected = false;

    let isTimeoutOrLimitExceeded = false;
    const startTime = Date.now();

    const isConfidenceMet = () => {
      return pmDetected && cicdDetected && frameworkDetected;
    };

    const getDirPriority = (name: string): number => {
      const lower = name.toLowerCase();
      if (['src', 'app', 'packages', 'server', 'backend', 'api', 'config'].includes(lower)) return 4;
      if (lower === 'scripts') return 3;
      if (['tests', 'integration', 'test', 'spec'].includes(lower)) return 2;
      if (['examples', 'example', 'samples', 'sample', 'docs', 'documentation', 'benchmarks', 'fixtures'].includes(lower)) return 1;
      return 0; // Default
    };

    const isExcludedDir = (dirName: string, fullPath: string): boolean => {
      const lower = dirName.toLowerCase();
      const absoluteHeavy = [
        'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
        'vendor', '.cache', 'tmp', 'temp', 'generated', 'out'
      ];
      if (absoluteHeavy.includes(lower)) return true;
      
      const softHeavy = [
        'examples', 'example', 'samples', 'sample', 'docs', 'documentation', 
        'benchmarks', 'fixtures'
      ];
      if (softHeavy.includes(lower)) {
        if (isConfidenceMet() || fastScan || isTimeoutOrLimitExceeded) return true;
        // Check depth-1 only for configuration files
        try {
          const items = fs.readdirSync(fullPath);
          const hasConfig = items.some(item => IMPORTANT_FILE_NAMES.includes(item));
          return !hasConfig;
        } catch {
          return true;
        }
      }
      return false;
    };

    const walk = async (dir: string, depth: number) => {
      if (depth > maxDepth) {
        maxDepth = depth;
      }

      if (fastScan && depth >= 3) {
        return;
      }

      // Large Repository Fallback: stop traversing if taking too long or too large
      if (Date.now() - startTime > 4000 || fileCount > 15000) {
        isTimeoutOrLimitExceeded = true;
        return;
      }

      try {
        const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
        
        // Prioritize folders and priority paths
        dirents.sort((a, b) => {
          const pA = a.isDirectory() ? getDirPriority(a.name) : -1;
          const pB = b.isDirectory() ? getDirPriority(b.name) : -1;
          return pB - pA;
        });

        for (const dirent of dirents) {
          const fullPath = path.join(dir, dirent.name);
          const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

          if (dirent.isDirectory()) {
            if (isExcludedDir(dirent.name, fullPath)) {
              continue;
            }

            // Limit recursion depth: max depth 8, unless scanning production/config paths
            if (depth >= 8) {
              const relLower = relativePath.toLowerCase();
              const isException = 
                relLower.includes('/src/') || relLower.startsWith('src/') ||
                relLower.includes('/app/') || relLower.startsWith('app/') ||
                relLower.includes('/packages/') || relLower.startsWith('packages/') ||
                relLower.includes('/server/') || relLower.startsWith('server/') ||
                relLower.includes('/backend/') || relLower.startsWith('backend/') ||
                relLower.includes('/api/') || relLower.startsWith('api/') ||
                relLower.includes('/config/') || relLower.startsWith('config/');
              if (!isException) {
                continue;
              }
            }

            // Bypasses unrelated folder traversal if confidence already met
            if (isConfidenceMet() && getDirPriority(dirent.name) <= 2) {
              continue;
            }

            folderCount++;
            
            repoIndex.push({
              relativePath,
              extension: '',
              size: 0,
              isDirectory: true,
              isImportant: relativePath === '.github/workflows'
            });

            if (relativePath === '.github/workflows') {
              importantFiles.push('.github/workflows');
              cicdDetected = true;
            }

            await walk(fullPath, depth + 1);
          } else if (dirent.isFile()) {
            fileCount++;

            const ext = path.extname(dirent.name).toLowerCase();
            if (ext) {
              extensions[ext] = (extensions[ext] || 0) + 1;
            }

            const isImportant = IMPORTANT_FILE_NAMES.includes(dirent.name);
            if (isImportant) {
              importantFiles.push(relativePath);

              if (
                dirent.name === 'package.json' || 
                dirent.name === 'yarn.lock' || 
                dirent.name === 'pnpm-lock.yaml' || 
                dirent.name === 'pom.xml' || 
                dirent.name === 'requirements.txt'
              ) {
                pmDetected = true;
              }
              if (
                dirent.name === 'tsconfig.json' || 
                dirent.name === 'vite.config.ts' || 
                dirent.name === 'next.config.js' ||
                dirent.name === 'next.config.mjs' ||
                dirent.name === 'vite.config.js'
              ) {
                frameworkDetected = true;
              }
              if (
                dirent.name === 'vercel.json' || 
                dirent.name === 'netlify.toml' ||
                dirent.name === 'render.yaml'
              ) {
                cicdDetected = true;
              }
            }

            const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tar', '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot', '.bin', '.exe', '.dll', '.dmg', '.iso'].includes(ext);
            
            if (isBinary && largestFiles.length >= 5) {
              repoIndex.push({
                relativePath,
                extension: ext,
                size: 0,
                isDirectory: false,
                isImportant
              });
              continue;
            }

            try {
              const fileStat = await fs.promises.stat(fullPath);
              totalSize += fileStat.size;

              repoIndex.push({
                relativePath,
                extension: ext,
                size: fileStat.size,
                isDirectory: false,
                isImportant
              });

              if (largestFiles.length < 5) {
                largestFiles.push({ path: relativePath, size: fileStat.size });
                largestFiles.sort((a, b) => b.size - a.size);
              } else if (fileStat.size > largestFiles[4].size) {
                largestFiles[4] = { path: relativePath, size: fileStat.size };
                largestFiles.sort((a, b) => b.size - a.size);
              }
            } catch {
              repoIndex.push({
                relativePath,
                extension: ext,
                size: 0,
                isDirectory: false,
                isImportant
              });
            }
          }
        }
      } catch (err) {
        // Skip unreadable items
      }
    };

    if (fs.existsSync(repoPath)) {
      await walk(repoPath, 0);
    }

    const runFastScan = fastScan || isTimeoutOrLimitExceeded;

    return {
      folderCount,
      fileCount,
      totalSize,
      maxDepth,
      extensions,
      largestFiles,
      importantFiles: Array.from(new Set(importantFiles)),
      repoIndex,
      analysis_mode: runFastScan ? 'Fast Scan' : 'Full Scan',
      confidence: runFastScan ? 95 : 100,
      message: runFastScan 
        ? 'Large repository detected. High-confidence partial analysis completed.' 
        : 'Complete audit report generated successfully.'
    };
  }
}
