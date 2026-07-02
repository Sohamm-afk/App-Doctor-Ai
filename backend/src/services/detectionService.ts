import fs from 'fs';
import path from 'path';
import { ScanResult, TechnologyInfo } from '../types';

export class DetectionService {
  /**
   * Identifies technology stack components (frontend, backend, database, package manager, CI/CD)
   * from directory configurations, file content, and package dependencies.
   */
  public static async detectTechnologies(
    repoPath: string,
    scanResult: ScanResult
  ): Promise<TechnologyInfo> {
    const languages: string[] = [];
    let frontend: string | undefined;
    let backend: string | undefined;
    let database: string | undefined;
    let packageManager: string | undefined;
    let deployment: string | undefined;
    let ciCd: string | undefined;

    // 1. Language detection from extension list
    const ext = scanResult.extensions;
    if (ext['.js'] || ext['.jsx'] || ext['.mjs'] || ext['.cjs']) languages.push('JavaScript');
    if (ext['.ts'] || ext['.tsx'] || ext['.mts'] || ext['.cts']) languages.push('TypeScript');
    if (ext['.py'] || ext['.ipynb']) languages.push('Python');
    if (ext['.go']) languages.push('Go');
    if (ext['.rs']) languages.push('Rust');
    if (ext['.java'] || ext['.jar']) languages.push('Java');
    if (ext['.cs']) languages.push('C#');
    if (ext['.php']) languages.push('PHP');
    if (ext['.cpp'] || ext['.cc'] || ext['.cxx'] || ext['.h'] || ext['.hpp']) languages.push('C++');

    // Helper to recursively find package.json files
    const findPackageJsons = (dir: string): string[] => {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const name = entry.name;
          const lowerName = name.toLowerCase();
          if (entry.isDirectory()) {
            if (
              lowerName === 'node_modules' ||
              lowerName === 'docs' ||
              lowerName === 'examples' ||
              lowerName === 'tests' ||
              lowerName === 'coverage' ||
              lowerName === 'dist' ||
              lowerName === 'build' ||
              lowerName === '.git'
            ) {
              continue;
            }
            results.push(...findPackageJsons(path.join(dir, name)));
          } else if (entry.isFile() && lowerName === 'package.json') {
            results.push(path.join(dir, name));
          }
        }
      } catch {}
      return results;
    };

    // 2. Read package.json dependencies recursively and merge them
    const deps: Record<string, string> = {};
    let rootPackageName = '';
    const packageFiles = findPackageJsons(repoPath);

    const frameworkScores = {
      React: 0,
      'Next.js': 0,
      Vue: 0,
      Angular: 0,
      Svelte: 0,
      Nuxt: 0,
      Express: 0,
      NestJS: 0,
    };

    for (const pkgFile of packageFiles) {
      try {
        const fileContent = fs.readFileSync(pkgFile, 'utf8');
        const pkgData = JSON.parse(fileContent);

        // Track root package name for library matching
        if (path.relative(repoPath, pkgFile) === 'package.json') {
          if (pkgData.name) {
            rootPackageName = pkgData.name.toLowerCase();
          }
        }

        if (pkgData.dependencies) Object.assign(deps, pkgData.dependencies);
        if (pkgData.devDependencies) Object.assign(deps, pkgData.devDependencies);
        if (pkgData.peerDependencies) Object.assign(deps, pkgData.peerDependencies);
        if (pkgData.optionalDependencies) Object.assign(deps, pkgData.optionalDependencies);

        // Score frameworks - ignore examples, demo, playground, fixtures, docs, tests, test, coverage
        const relPath = path.relative(repoPath, pkgFile).toLowerCase().replace(/\\/g, '/');
        const isIgnored = 
          relPath.includes('/examples/') || relPath.startsWith('examples/') ||
          relPath.includes('/example/') || relPath.startsWith('example/') ||
          relPath.includes('/demo/') || relPath.startsWith('demo/') ||
          relPath.includes('/playground/') || relPath.startsWith('playground/') ||
          relPath.includes('/fixtures/') || relPath.startsWith('fixtures/') ||
          relPath.includes('/docs/') || relPath.startsWith('docs/') ||
          relPath.includes('/tests/') || relPath.startsWith('tests/') ||
          relPath.includes('/test/') || relPath.startsWith('test/') ||
          relPath.includes('/coverage/') || relPath.startsWith('coverage/');

        if (!isIgnored) {
          const localDeps: Record<string, any> = {};
          if (pkgData.dependencies) Object.assign(localDeps, pkgData.dependencies);
          if (pkgData.devDependencies) Object.assign(localDeps, pkgData.devDependencies);
          if (pkgData.peerDependencies) Object.assign(localDeps, pkgData.peerDependencies);
          if (pkgData.optionalDependencies) Object.assign(localDeps, pkgData.optionalDependencies);

          const name = (pkgData.name || '').toLowerCase();
          if (name === 'react' || name === 'react-dom') frameworkScores['React']++;
          if (name === 'next') frameworkScores['Next.js']++;
          if (name === 'vue') frameworkScores['Vue']++;
          if (name === 'express') frameworkScores['Express']++;

          if (localDeps['react'] || localDeps['react-dom']) frameworkScores['React']++;
          if (localDeps['next']) frameworkScores['Next.js']++;
          if (localDeps['vue']) frameworkScores['Vue']++;
          if (localDeps['@angular/core']) frameworkScores['Angular']++;
          if (localDeps['svelte'] || localDeps['@sveltejs/kit']) frameworkScores['Svelte']++;
          if (localDeps['nuxt']) frameworkScores['Nuxt']++;
          if (localDeps['express']) frameworkScores['Express']++;
          if (localDeps['@nestjs/core']) frameworkScores['NestJS']++;
        }
      } catch {}
    }

    // Determine the highest scoring frontend and backend frameworks
    let dominantFrontend: string | undefined;
    let dominantBackend: string | undefined;

    let maxFrontendScore = 0;
    const frontendFrameworks: (keyof typeof frameworkScores)[] = ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Nuxt'];
    for (const fw of frontendFrameworks) {
      if (frameworkScores[fw] > maxFrontendScore) {
        maxFrontendScore = frameworkScores[fw];
        dominantFrontend = fw;
      }
    }

    let maxBackendScore = 0;
    const backendFrameworks: (keyof typeof frameworkScores)[] = ['Express', 'NestJS', 'Next.js', 'Nuxt'];
    for (const fw of backendFrameworks) {
      if (frameworkScores[fw] > maxBackendScore) {
        maxBackendScore = frameworkScores[fw];
        dominantBackend = fw;
      }
    }

    if (maxFrontendScore > 0) frontend = dominantFrontend;
    if (maxBackendScore > 0) backend = dominantBackend;

    // Prevent false positives for libraries themselves
    if (rootPackageName === 'axios') {
      frontend = undefined;
      backend = undefined;
    }
    if (rootPackageName === 'express') {
      frontend = undefined;
      backend = undefined;
    }

    // 3. Python backend framework detection from root configurations only
    let pyDeps = '';
    if (fs.existsSync(path.join(repoPath, 'requirements.txt'))) {
      try {
        pyDeps = await fs.promises.readFile(path.join(repoPath, 'requirements.txt'), 'utf8');
      } catch {}
    }
    if (fs.existsSync(path.join(repoPath, 'pyproject.toml'))) {
      try {
        pyDeps += '\n' + (await fs.promises.readFile(path.join(repoPath, 'pyproject.toml'), 'utf8'));
      } catch {}
    }

    if (!backend) {
      const lowerPyDeps = pyDeps.toLowerCase();
      if (lowerPyDeps.includes('django') || fs.existsSync(path.join(repoPath, 'manage.py'))) {
        backend = 'Django';
      } else if (lowerPyDeps.includes('flask')) {
        backend = 'Flask';
      } else if (lowerPyDeps.includes('fastapi')) {
        backend = 'FastAPI';
      }
    }

    // 3b. Java/Spring Boot framework detection
    if (!backend) {
      if (fs.existsSync(path.join(repoPath, 'pom.xml'))) {
        try {
          const pom = await fs.promises.readFile(path.join(repoPath, 'pom.xml'), 'utf8');
          if (pom.includes('spring-boot-starter')) backend = 'Spring Boot';
        } catch {}
      } else if (fs.existsSync(path.join(repoPath, 'build.gradle'))) {
        try {
          const gradle = await fs.promises.readFile(path.join(repoPath, 'build.gradle'), 'utf8');
          if (gradle.includes('org.springframework.boot')) backend = 'Spring Boot';
        } catch {}
      }
    }

    // 3c. PHP/Laravel framework detection
    if (!backend) {
      if (fs.existsSync(path.join(repoPath, 'artisan')) || fs.existsSync(path.join(repoPath, 'composer.json'))) {
        backend = 'Laravel';
      }
    }

    // 3d. C#/ASP.NET framework detection
    if (!backend && languages.includes('C#')) {
      backend = 'ASP.NET';
    }

    // 4. Database detection
    if (deps['@prisma/client'] || deps['prisma']) {
      database = 'Prisma';
    } else if (deps['drizzle-orm']) {
      database = 'Drizzle';
    } else if (deps['typeorm']) {
      database = 'TypeORM';
    } else if (deps['sequelize']) {
      database = 'Sequelize';
    } else if (deps['mongoose'] || deps['mongodb']) {
      database = 'MongoDB';
    } else if (deps['redis'] || deps['ioredis']) {
      database = 'Redis';
    } else if (deps['pg'] || deps['postgres'] || deps['pg-promise']) {
      database = 'PostgreSQL';
    } else if (deps['mysql'] || deps['mysql2']) {
      database = 'MySQL';
    } else if (deps['sqlite3'] || deps['better-sqlite3']) {
      database = 'SQLite';
    }

    if (!database && pyDeps) {
      const lowerPy = pyDeps.toLowerCase();
      if (lowerPy.includes('redis')) {
        database = 'Redis';
      } else if (lowerPy.includes('pymongo') || lowerPy.includes('mongoengine')) {
        database = 'MongoDB';
      } else if (lowerPy.includes('psycopg2') || lowerPy.includes('psycopg')) {
        database = 'PostgreSQL';
      } else if (lowerPy.includes('pymysql') || lowerPy.includes('mysql-connector-python') || lowerPy.includes('mysqlclient')) {
        database = 'MySQL';
      }
    }

    if (!database && fs.existsSync(repoPath)) {
      database = (await this.findDatabaseInfo(repoPath)) || undefined;
    }

    // 5. Deployment configurations detection
    if (scanResult.importantFiles.some((f) => f.endsWith('Dockerfile'))) {
      deployment = 'Docker';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('docker-compose.yml') || f.endsWith('docker-compose.yaml'))) {
      deployment = 'Docker Compose';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('vercel.json'))) {
      deployment = 'Vercel';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('netlify.toml'))) {
      deployment = 'Netlify';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('render.yaml'))) {
      deployment = 'Render';
    }
    if (fs.existsSync(path.join(repoPath, 'railway.json')) || fs.existsSync(path.join(repoPath, '.railway'))) {
      deployment = 'Railway';
    }
    if (fs.existsSync(path.join(repoPath, 'k8s')) || fs.existsSync(path.join(repoPath, 'kubernetes'))) {
      deployment = 'Kubernetes';
    }

    // 6. Package manager detection
    if (scanResult.importantFiles.some((f) => f.endsWith('package-lock.json'))) {
      packageManager = 'npm';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('yarn.lock'))) {
      packageManager = 'yarn';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('requirements.txt') || f.endsWith('pyproject.toml') || f.endsWith('Pipfile'))) {
      packageManager = 'pip';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('package.json'))) {
      packageManager = 'npm'; // fallback logic for JS
    }

    // 7. CI/CD workflows detection
    if (scanResult.importantFiles.includes('.github/workflows')) {
      ciCd = 'GitHub Actions';
    }

    return {
      languages,
      frontend,
      backend,
      database: database || null,
      packageManager,
      deployment,
      ciCd,
    };
  }

  private static async findDatabaseInfo(dir: string): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const nameLower = entry.name.toLowerCase();

        if (entry.isDirectory()) {
          if (
            nameLower === '.git' ||
            nameLower === 'node_modules' ||
            nameLower === 'dist' ||
            nameLower === 'build' ||
            nameLower === 'coverage' ||
            nameLower === 'test' ||
            nameLower === 'tests' ||
            nameLower === 'example' ||
            nameLower === 'examples' ||
            nameLower === 'docs' ||
            nameLower === 'vendor' ||
            nameLower === 'tmp' ||
            nameLower === 'temp' ||
            nameLower === 'venv' ||
            nameLower === '.venv' ||
            nameLower === '__pycache__'
          ) {
            continue;
          }
          const subResult = await this.findDatabaseInfo(fullPath);
          if (subResult) return subResult;
        } else if (entry.isFile()) {
          if (nameLower === 'schema.prisma') return 'Prisma';
          if (nameLower.startsWith('drizzle.config.')) return 'Drizzle';
          if (nameLower.startsWith('ormconfig.')) return 'TypeORM';
          if (nameLower === '.sequelizerc') return 'Sequelize';

          const ext = path.extname(entry.name).toLowerCase();
          if (['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.java'].includes(ext)) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const jsImportRegex = /(?:import\s+.*\s+from\s+['"]|require\(['"])(redis|ioredis|pg|postgres|mysql|mysql2|sqlite3|better-sqlite3|better-sqlite|mongodb|mongoose|sequelize|typeorm|drizzle-orm|@prisma\/client)['"]/i;
              const pyImportRegex = /^\s*(?:import|from)\s+(redis|pymongo|mongoengine|psycopg2|psycopg|mysql|mysql\.connector|pymysql|sqlite3)\b/m;

              const jsMatch = content.match(jsImportRegex);
              if (jsMatch) {
                const matched = jsMatch[1].toLowerCase();
                if (matched === 'redis' || matched === 'ioredis') return 'Redis';
                if (matched === 'pg' || matched === 'postgres') return 'PostgreSQL';
                if (matched === 'mysql' || matched === 'mysql2') return 'MySQL';
                if (matched === 'sqlite3' || matched === 'better-sqlite3' || matched === 'better-sqlite') return 'SQLite';
                if (matched === 'mongodb' || matched === 'mongoose') return 'MongoDB';
                if (matched === 'sequelize') return 'Sequelize';
                if (matched === 'typeorm') return 'TypeORM';
                if (matched === 'drizzle-orm') return 'Drizzle';
                if (matched === '@prisma/client') return 'Prisma';
              }

              const pyMatch = content.match(pyImportRegex);
              if (pyMatch) {
                const matched = pyMatch[1].toLowerCase();
                if (matched === 'redis') return 'Redis';
                if (matched === 'pymongo' || matched === 'mongoengine') return 'MongoDB';
                if (matched === 'psycopg2' || matched === 'psycopg') return 'PostgreSQL';
                if (matched === 'mysql' || matched === 'mysql\.connector' || matched === 'pymysql') return 'MySQL';
                if (matched === 'sqlite3') return 'SQLite';
              }
            } catch {
              // Ignore read errors
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
    return null;
  }
}
