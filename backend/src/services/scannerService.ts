import fs from 'fs';
import path from 'path';
import { ScanResult } from '../types';
import { measureFolderSize, getDirectoryDepth } from '../utils/fileSystem';

const IMPORTANT_FILE_NAMES = [
  'README.md',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'Dockerfile',
  'docker-compose.yml',
  '.gitignore',
  '.env.example',
  'vite.config.ts',
  'next.config.js',
  'tailwind.config.js',
  'tsconfig.json'
];

export class ScannerService {
  /**
   * Recursively scans directory to compile folder structure metrics and detect important files.
   */
  public static async scanRepository(repoPath: string): Promise<ScanResult> {
    const extensions: Record<string, number> = {};
    const largestFiles: { path: string; size: number }[] = [];
    const importantFiles: string[] = [];
    
    let fileCount = 0;
    let folderCount = 0;

    const walk = async (dir: string) => {
      try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = await fs.promises.lstat(fullPath);
          const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

          if (stat.isDirectory()) {
            // Ignore bulky dependency and VCS directories
            if (file === '.git' || file === 'node_modules' || file === 'venv' || file === '.venv') {
              continue;
            }
            folderCount++;
            
            // Check for .github/workflows directory presence
            if (relativePath === '.github/workflows') {
              importantFiles.push('.github/workflows');
            }
            
            await walk(fullPath);
          } else {
            fileCount++;
            
            const ext = path.extname(file).toLowerCase();
            if (ext) {
              extensions[ext] = (extensions[ext] || 0) + 1;
            }

            // Check if file fits any of the important file profiles
            if (IMPORTANT_FILE_NAMES.includes(file)) {
              importantFiles.push(relativePath);
            }

            // Maintain top 5 largest files list
            largestFiles.push({ path: relativePath, size: stat.size });
            largestFiles.sort((a, b) => b.size - a.size);
            if (largestFiles.length > 5) {
              largestFiles.pop();
            }
          }
        }
      } catch (err) {
        // Skip unreadable files or directories
      }
    };

    if (fs.existsSync(repoPath)) {
      await walk(repoPath);
    }

    const totalSize = await measureFolderSize(repoPath);
    const maxDepth = await getDirectoryDepth(repoPath);

    return {
      folderCount,
      fileCount,
      totalSize,
      maxDepth,
      extensions,
      largestFiles,
      importantFiles: Array.from(new Set(importantFiles)),
    };
  }
}
