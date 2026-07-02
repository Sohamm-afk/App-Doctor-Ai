import fs from 'fs';
import path from 'path';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface RepositoryContext {
  metadata: {
    projectName: string;
    fileCount: number;
    folderCount: number;
    totalSize: number;
  };
  packageJson: any | null;
  dependencies: { [name: string]: string };
  configs: { [filename: string]: string };
  folderTree: TreeNode | null;
  sourceFiles: { path: string; content: string }[];
}

export class RepositoryContextService {
  private static IGNORED = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'test',
    'tests',
    'example',
    'examples',
    'docs',
    'vendor',
    'tmp',
    'temp',
    '.venv',
    'venv',
    '__pycache__'
  ]);

  private static ALLOWED_SRC_DIRS = [
    'src', 'app', 'lib', 'server', 'api', 'controllers',
    'routes', 'middleware', 'services', 'models', 'utils'
  ];

  private static SUPPORTED_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs'
  ]);

  private static CONFIG_FILES = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'README.md',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '.env.example',
    'tsconfig.json',
    'requirements.txt',
    'pyproject.toml',
    'pom.xml',
    'build.gradle',
    'Cargo.toml',
    'go.mod'
  ];

  private static CONFIG_WILD_PREFIXES = [
    'vite.config.',
    'next.config.',
    'tailwind.config.'
  ];

  /**
   * Builds context of the repository at repositoryPath.
   */
  public static buildContext(repositoryPath: string): RepositoryContext {
    let fileCount = 0;
    let folderCount = 0;
    let totalSize = 0;

    // Helper to scan stats
    const scanStats = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const nameLower = entry.name.toLowerCase();
        if (this.IGNORED.has(nameLower)) continue;

        if (entry.isDirectory()) {
          folderCount++;
          scanStats(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          try {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          } catch (err) {
            // Ignore stats failures
          }
        }
      }
    };

    scanStats(repositoryPath);

    const metadata = {
      projectName: path.basename(repositoryPath),
      fileCount,
      folderCount,
      totalSize,
    };

    // Parse package.json
    let packageJson: any = null;
    const pkgPath = path.join(repositoryPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      } catch (err) {
        console.error('[RepositoryContextService] Failed to parse package.json:', err);
      }
    }

    // Extract configurations
    const configs: { [filename: string]: string } = {};
    if (fs.existsSync(repositoryPath)) {
      const rootEntries = fs.readdirSync(repositoryPath);
      for (const entry of rootEntries) {
        const fullPath = path.join(repositoryPath, entry);
        try {
          if (!fs.statSync(fullPath).isFile()) continue;

          const isMatch = this.CONFIG_FILES.includes(entry) || 
            this.CONFIG_WILD_PREFIXES.some(prefix => entry.startsWith(prefix));

          if (isMatch) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split(/\r?\n/).slice(0, 300).join('\n');
            configs[entry] = lines;
          }
        } catch (err) {
          // Ignore read errors
        }
      }
    }

    // Extract dependencies
    const dependencies: { [name: string]: string } = {};
    if (packageJson) {
      if (packageJson.dependencies) {
        Object.assign(dependencies, packageJson.dependencies);
      }
      if (packageJson.devDependencies) {
        Object.assign(dependencies, packageJson.devDependencies);
      }
    }

    const reqPath = path.join(repositoryPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      try {
        const reqContent = fs.readFileSync(reqPath, 'utf-8');
        const lines = reqContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const parts = trimmed.split(/==|>=|<=|>|<|~=/);
          if (parts.length > 0) {
            const name = parts[0].trim();
            const version = parts[1] ? parts[1].trim() : 'latest';
            dependencies[name] = version;
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    const cargoPath = path.join(repositoryPath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      try {
        const cargoContent = fs.readFileSync(cargoPath, 'utf-8');
        const lines = cargoContent.split(/\r?\n/);
        let inDependencies = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('[dependencies]')) {
            inDependencies = true;
            continue;
          }
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            inDependencies = false;
            continue;
          }
          if (inDependencies && trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const name = trimmed.substring(0, eqIdx).trim();
              const ver = trimmed.substring(eqIdx + 1).replace(/"/g, '').trim();
              dependencies[name] = ver;
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    const goModPath = path.join(repositoryPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      try {
        const goContent = fs.readFileSync(goModPath, 'utf-8');
        const lines = goContent.split(/\r?\n/);
        let inRequire = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('require (')) {
            inRequire = true;
            continue;
          }
          if (inRequire && trimmed === ')') {
            inRequire = false;
            continue;
          }
          if (trimmed.startsWith('require ')) {
            const parts = trimmed.replace('require ', '').trim().split(/\s+/);
            if (parts.length >= 2) {
              dependencies[parts[0]] = parts[1];
            }
          } else if (inRequire && trimmed && !trimmed.startsWith('//')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
              dependencies[parts[0]] = parts[1];
            }
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    // Build Folder Tree
    const buildFolderTree = (currentPath: string): TreeNode | null => {
      if (!fs.existsSync(currentPath)) return null;
      const name = path.basename(currentPath);
      const nameLower = name.toLowerCase();

      if (this.IGNORED.has(nameLower)) {
        return null;
      }

      try {
        const stats = fs.statSync(currentPath);
        if (stats.isDirectory()) {
          const children: TreeNode[] = [];
          const entries = fs.readdirSync(currentPath);
          for (const entry of entries) {
            const childNode = buildFolderTree(path.join(currentPath, entry));
            if (childNode) {
              children.push(childNode);
            }
          }
          return { name, type: 'directory', children };
        } else {
          return { name, type: 'file' };
        }
      } catch (err) {
        return null;
      }
    };

    const folderTree = buildFolderTree(repositoryPath);

    // Read Source Files
    const sourceFiles: { path: string; content: string }[] = [];
    const collectSourceFiles = (dir: string) => {
      if (sourceFiles.length >= 200) return;
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(repositoryPath, fullPath).replace(/\\/g, '/');
        const nameLower = entry.name.toLowerCase();

        if (entry.isDirectory()) {
          if (this.IGNORED.has(nameLower)) continue;
          collectSourceFiles(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.SUPPORTED_EXTENSIONS.has(ext)) {
            const parts = relPath.split('/');
            if (parts.length > 0 && this.ALLOWED_SRC_DIRS.includes(parts[0])) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split(/\r?\n/).slice(0, 300).join('\n');
                sourceFiles.push({
                  path: relPath,
                  content: lines
                });
              } catch (err) {
                // Ignore read errors
              }
              if (sourceFiles.length >= 200) return;
            }
          }
        }
      }
    };

    collectSourceFiles(repositoryPath);

    return {
      metadata,
      packageJson,
      dependencies,
      configs,
      folderTree,
      sourceFiles,
    };
  }
}
