import fs from 'fs';
import path from 'path';
import { ScanResult, TechnologyInfo, IndexedFile } from '../types';

export class DetectionService {
  /**
   * Identifies technology stack components (frontend, backend, database, package manager, CI/CD)
   * from directory configurations, file content, and package dependencies.
   * Completely query-driven from in-memory Repository Index to avoid blocking filesystem traversals.
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

    // Helper to check if file exists in the index
    const indexHasFile = (relPath: string) => {
      const clean = relPath.replace(/\\/g, '/').toLowerCase();
      return (scanResult.repoIndex || []).some(f => !f.isDirectory && f.relativePath.toLowerCase() === clean);
    };

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

    // 2. Read package.json dependencies recursively from index
    const deps: Record<string, string> = {};
    const collectedDependencies = new Set<string>();
    const collectedDevDependencies = new Set<string>();
    const collectedImports = new Set<string>();
    let rootPackageName = '';
    
    const packageFiles = (scanResult.repoIndex || [])
      .filter(f => !f.isDirectory && f.relativePath.toLowerCase().endsWith('package.json') && 
                   !f.relativePath.toLowerCase().includes('node_modules') &&
                   !f.relativePath.toLowerCase().includes('dist') &&
                   !f.relativePath.toLowerCase().includes('build'))
      .map(f => f.relativePath);

    for (const pkgFile of packageFiles) {
      try {
        const fullPkgPath = path.join(repoPath, pkgFile);
        const fileContent = fs.readFileSync(fullPkgPath, 'utf8');
        const pkgData = JSON.parse(fileContent);

        // Track root package name for library matching
        if (pkgFile.toLowerCase() === 'package.json') {
          if (pkgData.name) {
            rootPackageName = pkgData.name.toLowerCase();
          }
        }

        if (pkgData.dependencies) {
          Object.assign(deps, pkgData.dependencies);
          Object.keys(pkgData.dependencies).forEach(d => collectedDependencies.add(d.toLowerCase()));
        }
        if (pkgData.devDependencies) {
          Object.assign(deps, pkgData.devDependencies);
          Object.keys(pkgData.devDependencies).forEach(d => collectedDevDependencies.add(d.toLowerCase()));
        }
        if (pkgData.peerDependencies) {
          Object.assign(deps, pkgData.peerDependencies);
          Object.keys(pkgData.peerDependencies).forEach(d => collectedDependencies.add(d.toLowerCase()));
        }
        if (pkgData.optionalDependencies) {
          Object.assign(deps, pkgData.optionalDependencies);
          Object.keys(pkgData.optionalDependencies).forEach(d => collectedDependencies.add(d.toLowerCase()));
        }
      } catch {}
    }

    // Read Python configurations recursively from index
    let pythonDeps = '';
    const pyConfigs = ['pyproject.toml', 'requirements.txt', 'pipfile', 'poetry.lock'];
    const pyFiles = (scanResult.repoIndex || [])
      .filter(f => !f.isDirectory && pyConfigs.includes(path.basename(f.relativePath).toLowerCase()))
      .map(f => f.relativePath);

    for (const pyFile of pyFiles) {
      try {
        const fileContent = fs.readFileSync(path.join(repoPath, pyFile), 'utf8');
        pythonDeps += '\n' + fileContent;
        fileContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split(/[=<>]/);
            if (parts[0]) {
              collectedDependencies.add(parts[0].trim().toLowerCase());
            }
          }
        });
      } catch {}
    }
    const pyLower = pythonDeps.toLowerCase();

    // Read PHP configurations
    let phpDeps = '';
    const phpConfigs = ['composer.json', 'composer.lock'];
    const phpFiles = (scanResult.repoIndex || [])
      .filter(f => !f.isDirectory && phpConfigs.includes(path.basename(f.relativePath).toLowerCase()))
      .map(f => f.relativePath);

    for (const phpFile of phpFiles) {
      try {
        const fileContent = fs.readFileSync(path.join(repoPath, phpFile), 'utf8');
        phpDeps += '\n' + fileContent;
        if (phpFile.toLowerCase().endsWith('composer.json')) {
          try {
            const pkgData = JSON.parse(fileContent);
            if (pkgData.require) {
              Object.keys(pkgData.require).forEach(d => collectedDependencies.add(d.toLowerCase()));
            }
            if (pkgData['require-dev']) {
              Object.keys(pkgData['require-dev']).forEach(d => collectedDevDependencies.add(d.toLowerCase()));
            }
          } catch {}
        }
      } catch {}
    }
    const phpLower = phpDeps.toLowerCase();

    // Read Java Maven/Gradle configurations
    let javaDeps = '';
    const javaConfigs = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
    const javaFiles = (scanResult.repoIndex || [])
      .filter(f => !f.isDirectory && javaConfigs.includes(path.basename(f.relativePath).toLowerCase()))
      .map(f => f.relativePath);

    for (const javaFile of javaFiles) {
      try {
        const fileContent = fs.readFileSync(path.join(repoPath, javaFile), 'utf8');
        javaDeps += '\n' + fileContent;
        const depRegex = /<dependency>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<\/dependency>/g;
        let match;
        while ((match = depRegex.exec(fileContent)) !== null) {
          if (match[1]) collectedDependencies.add(match[1].trim().toLowerCase());
        }
        const gradleRegex = /(?:implementation|api|testImplementation)\s+['"]([^'"]+)['"]/g;
        while ((match = gradleRegex.exec(fileContent)) !== null) {
          if (match[1]) {
            const parts = match[1].split(':');
            if (parts[1]) collectedDependencies.add(parts[1].trim().toLowerCase());
          }
        }
      } catch {}
    }

    // Framework detection indicators
    let hasReact = !!(deps['react'] || deps['react-dom'] || rootPackageName === 'react' || rootPackageName === 'react-dom');
    let hasNext = !!(deps['next'] || rootPackageName === 'next' || indexHasFile('next.config.js') || indexHasFile('next.config.mjs'));
    let hasVue = !!(deps['vue'] || deps['nuxt'] || rootPackageName === 'vue' || rootPackageName === 'nuxt');
    let hasAngular = !!(deps['@angular/core'] || rootPackageName === 'angular');
    let hasSvelte = !!(deps['svelte'] || deps['@sveltejs/kit'] || indexHasFile('svelte.config.js'));
    let hasExpress = !!(deps['express'] || rootPackageName === 'express');
    let hasNest = !!(deps['@nestjs/core'] || deps['@nestjs/common'] || rootPackageName === 'nestjs');
    
    let hasDjango = pyLower.includes('django') || indexHasFile('manage.py');
    let hasFlask = pyLower.includes('flask');
    let hasFastApi = pyLower.includes('fastapi');
    
    let hasSpringBoot = javaDeps.includes('spring-boot') || javaDeps.includes('springframework.boot');
    let hasLaravel = phpLower.includes('laravel/') || indexHasFile('artisan');

    if (hasNext) frontend = 'Next.js';
    else if (hasVue) frontend = 'Vue';
    else if (hasAngular) frontend = 'Angular';
    else if (hasSvelte) frontend = 'Svelte';
    else if (hasReact) frontend = 'React';

    if (hasNext) backend = 'Next.js';
    else if (hasNest) backend = 'NestJS';
    else if (hasExpress) backend = 'Express';
    else if (hasDjango) backend = 'Django';
    else if (hasFlask) backend = 'Flask';
    else if (hasFastApi) backend = 'FastAPI';
    else if (hasSpringBoot) backend = 'Spring Boot';
    else if (hasLaravel) backend = 'Laravel';

    // Prevent false positives for general libraries themselves
    const libraryPackages = ['axios', 'lodash', 'react', 'react-dom', 'vue', 'angular', '@angular/core', 'svelte', 'lodash-es', 'jquery'];
    if (libraryPackages.includes(rootPackageName)) {
      frontend = undefined;
      backend = undefined;
    }

    // 4. Database detection
    const detectedDbs: string[] = [];
    if (deps['@prisma/client'] || deps['prisma'] || indexHasFile('schema.prisma')) {
      detectedDbs.push('Prisma');
    }
    if (deps['drizzle-orm'] || deps['drizzle-kit'] || indexHasFile('drizzle.config.ts') || indexHasFile('drizzle.config.js')) {
      detectedDbs.push('Drizzle');
    }
    if (deps['typeorm'] || indexHasFile('ormconfig.json') || indexHasFile('ormconfig.js')) {
      detectedDbs.push('TypeORM');
    }
    if (deps['mongoose']) {
      detectedDbs.push('Mongoose');
    }
    if (deps['mongodb'] || pyLower.includes('pymongo') || pyLower.includes('mongoengine') || deps['mongoose']) {
      detectedDbs.push('MongoDB');
    }
    if (deps['redis'] || deps['ioredis'] || pyLower.includes('redis')) {
      detectedDbs.push('Redis');
    }
    if (deps['pg'] || deps['postgres'] || deps['pg-promise'] || pyLower.includes('psycopg') || javaDeps.includes('postgresql') || phpLower.includes('pdo_pgsql')) {
      detectedDbs.push('Postgres');
    }
    if (deps['mysql'] || deps['mysql2'] || pyLower.includes('pymysql') || pyLower.includes('mysqlclient') || javaDeps.includes('mysql-connector') || phpLower.includes('pdo_mysql')) {
      detectedDbs.push('MySQL');
    }
    if (deps['sqlite3'] || deps['better-sqlite3'] || pyLower.includes('sqlite3') || scanResult.extensions['.sqlite'] || scanResult.extensions['.db'] || scanResult.extensions['.sqlite3']) {
      detectedDbs.push('SQLite');
    }
    if (deps['firebase'] || deps['firebase-admin'] || indexHasFile('firebase.json')) {
      detectedDbs.push('Firebase');
    }
    if (deps['@supabase/supabase-js'] || deps['@supabase/postgrest-js']) {
      detectedDbs.push('Supabase');
    }

    if (detectedDbs.length === 0) {
      const codeDb = await this.findDatabaseInfo(repoPath, scanResult.repoIndex);
      if (codeDb) {
        if (codeDb === 'PostgreSQL') detectedDbs.push('Postgres');
        else detectedDbs.push(codeDb);
      }
    }

    const dbSet = new Set(detectedDbs);
    const finalDbs: string[] = [];
    const allowedDbs = ['MongoDB', 'Postgres', 'MySQL', 'SQLite', 'Redis', 'Firebase', 'Supabase', 'Prisma', 'Drizzle', 'TypeORM', 'Mongoose'];
    allowedDbs.forEach(d => {
      if (dbSet.has(d)) finalDbs.push(d);
    });

    const repoNameLower = path.basename(repoPath).toLowerCase();
    const isFrameworkRepo = 
      repoNameLower.includes('nestjs') ||
      repoNameLower.includes('nest-') ||
      repoNameLower.includes('express') ||
      repoNameLower.includes('django') ||
      repoNameLower.includes('laravel') ||
      repoNameLower.includes('spring') ||
      repoNameLower.includes('react') ||
      repoNameLower.includes('vue') ||
      repoNameLower.includes('angular') ||
      repoNameLower.includes('svelte');

    const isFrameworkOrLib = isFrameworkRepo ||
      repoNameLower.includes('library') ||
      repoNameLower.includes('template') ||
      repoNameLower.includes('boilerplate') ||
      libraryPackages.includes(rootPackageName) ||
      rootPackageName.includes('middleware') ||
      rootPackageName.includes('plugin') ||
      rootPackageName.includes('starter');

    if (finalDbs.length > 0) {
      if (isFrameworkOrLib) {
        const databases: string[] = [];
        const orms: string[] = [];
        const drivers: string[] = [];
        const integrations: string[] = [];
        
        // ORMs
        if (deps['@prisma/client'] || deps['prisma'] || indexHasFile('schema.prisma')) {
          orms.push('Prisma');
        }
        if (deps['drizzle-orm'] || deps['drizzle-kit'] || indexHasFile('drizzle.config.ts') || indexHasFile('drizzle.config.js')) {
          orms.push('Drizzle');
        }
        if (deps['typeorm'] || indexHasFile('ormconfig.json') || indexHasFile('ormconfig.js')) {
          orms.push('TypeORM');
        }
        if (deps['mongoose']) {
          orms.push('Mongoose');
        }
        
        // Drivers
        if (deps['pg'] || deps['pg-promise'] || pyLower.includes('psycopg') || javaDeps.includes('postgresql')) {
          drivers.push('Postgres Driver (pg)');
        }
        if (deps['mysql2'] || deps['mysql'] || pyLower.includes('pymysql') || javaDeps.includes('mysql-connector')) {
          drivers.push('MySQL Driver (mysql2)');
        }
        if (deps['sqlite3'] || deps['better-sqlite3'] || pyLower.includes('sqlite3')) {
          drivers.push('SQLite Driver (sqlite3)');
        }
        if (deps['redis'] || deps['ioredis'] || pyLower.includes('redis')) {
          drivers.push('Redis Driver (ioredis)');
        }
        if (deps['mongodb'] || pyLower.includes('pymongo')) {
          drivers.push('MongoDB Driver (mongodb)');
        }
        
        // Databases
        if (dbSet.has('Postgres')) databases.push('Postgres');
        if (dbSet.has('MongoDB')) databases.push('MongoDB');
        if (dbSet.has('MySQL')) databases.push('MySQL');
        if (dbSet.has('SQLite')) databases.push('SQLite');
        if (dbSet.has('Redis')) databases.push('Redis');
        
        // Integrations
        if (deps['firebase'] || deps['firebase-admin'] || indexHasFile('firebase.json')) {
          integrations.push('Firebase');
        }
        if (deps['@supabase/supabase-js'] || deps['@supabase/postgrest-js']) {
          integrations.push('Supabase');
        }
        
        const parts: string[] = [];
        if (databases.length > 0) {
          parts.push(`Supported Databases:\n${databases.map(d => `- ${d}`).join('\n')}`);
        }
        if (orms.length > 0) {
          parts.push(`Supported ORMs:\n${orms.map(o => `- ${o}`).join('\n')}`);
        }
        if (drivers.length > 0) {
          parts.push(`Supported Drivers:\n${drivers.map(d => `- ${d}`).join('\n')}`);
        }
        if (integrations.length > 0) {
          parts.push(`Supported Integrations:\n${integrations.map(i => `- ${i}`).join('\n')}`);
        }
        
        database = parts.length > 0 ? parts.join('\n\n') : `Supported Integrations:\n${finalDbs.map(d => `- ${d}`).join('\n')}`;
      } else {
        database = `Project Database: ${finalDbs.join(', ')}`;
      }
    } else {
      database = undefined;
    }

    // 5. Deployment configurations detection
    if (scanResult.importantFiles.some((f) => f.endsWith('Dockerfile')) || indexHasFile('Dockerfile')) {
      deployment = 'Docker';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('docker-compose.yml') || f.endsWith('docker-compose.yaml')) || indexHasFile('docker-compose.yml') || indexHasFile('docker-compose.yaml')) {
      deployment = 'Docker Compose';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('vercel.json')) || indexHasFile('vercel.json')) {
      deployment = 'Vercel';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('netlify.toml')) || indexHasFile('netlify.toml')) {
      deployment = 'Netlify';
    }
    if (scanResult.importantFiles.some((f) => f.endsWith('render.yaml')) || indexHasFile('render.yaml')) {
      deployment = 'Render';
    }
    if (indexHasFile('railway.json') || indexHasFile('.railway')) {
      deployment = 'Railway';
    }
    const hasK8sDir = (scanResult.repoIndex || []).some(f => f.relativePath.toLowerCase().startsWith('k8s') || f.relativePath.toLowerCase().startsWith('kubernetes'));
    if (hasK8sDir || scanResult.importantFiles.some(f => f.includes('k8s/') || f.endsWith('.k8s.yaml'))) {
      deployment = 'Kubernetes';
    }

    // 6. Package manager detection
    if (scanResult.importantFiles.some((f) => f.endsWith('package-lock.json'))) {
      packageManager = 'npm';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('yarn.lock'))) {
      packageManager = 'yarn';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (indexHasFile('poetry.lock')) {
      packageManager = 'poetry';
    } else if (indexHasFile('Pipfile') || indexHasFile('Pipfile.lock')) {
      packageManager = 'pipenv';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('requirements.txt') || f.endsWith('pyproject.toml'))) {
      packageManager = 'pip';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('composer.lock') || f.endsWith('composer.json'))) {
      packageManager = 'composer';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('Cargo.lock') || f.endsWith('Cargo.toml'))) {
      packageManager = 'cargo';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('go.mod'))) {
      packageManager = 'go';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('pom.xml'))) {
      packageManager = 'maven';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'))) {
      packageManager = 'gradle';
    } else if (scanResult.importantFiles.some((f) => f.endsWith('package.json'))) {
      packageManager = 'npm'; // fallback
    }

    // 7. CI/CD workflows detection
    const hasCicdDir = (scanResult.repoIndex || []).some(f => f.relativePath.toLowerCase().startsWith('.github/workflows'));
    if (hasCicdDir || indexHasFile('.github/workflows')) {
      ciCd = 'GitHub Actions';
    } else if (indexHasFile('.gitlab-ci.yml')) {
      ciCd = 'GitLab CI';
    } else if (indexHasFile('.circleci/config.yml')) {
      ciCd = 'CircleCI';
    } else if (indexHasFile('.travis.yml')) {
      ciCd = 'Travis CI';
    }

    // Parse imports tree for code files
    const codeFilesForImports = (scanResult.repoIndex || []).filter(f => {
      if (f.isDirectory) return false;
      const lower = f.relativePath.toLowerCase();
      // Skip test, examples, docs, etc. to prevent false positives in dependencies!
      if (
        lower.includes('test') || 
        lower.includes('example') || 
        lower.includes('docs') || 
        lower.includes('vendor') || 
        lower.includes('node_modules')
      ) return false;
      return ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go'].includes(f.extension);
    });

    for (const file of codeFilesForImports.slice(0, 150)) {
      try {
        const fullPath = path.join(repoPath, file.relativePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const jsImportRegex = /(?:import\s+.*\s+from\s+['"]|require\(['"])([^'"]+)['"]/gi;
        let match;
        while ((match = jsImportRegex.exec(content)) !== null) {
          if (match[1] && !match[1].startsWith('.')) {
            collectedImports.add(match[1].toLowerCase());
          }
        }

        if (content.includes('createClient(')) collectedImports.add('createclient()');
        if (content.includes('jwt.sign(') || content.includes('jwt.verify(')) collectedImports.add('jwt.sign()');

        const pyImportRegex = /^\s*(?:import\s+(\w+)|from\s+(\w+)\s+import)/gm;
        while ((match = pyImportRegex.exec(content)) !== null) {
          const pkg = match[1] || match[2];
          if (pkg) collectedImports.add(pkg.toLowerCase());
        }
      } catch {}
    }

    return {
      languages,
      frontend,
      backend,
      database: database || null,
      packageManager,
      deployment,
      ciCd,
      dependencies: Array.from(collectedDependencies),
      devDependencies: Array.from(collectedDevDependencies),
      imports: Array.from(collectedImports),
    };
  }

  private static async findDatabaseInfo(repoPath: string, repoIndex: IndexedFile[]): Promise<string | null> {
    const codeFiles = (repoIndex || []).filter(f => {
      if (f.isDirectory) return false;
      const lower = f.relativePath.toLowerCase();
      if (
        lower.includes('test') || 
        lower.includes('example') || 
        lower.includes('docs') || 
        lower.includes('vendor') || 
        lower.includes('node_modules')
      ) return false;
      return ['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.java'].includes(f.extension);
    });

    const cleanConfig = (repoIndex || []).find(f => {
      if (f.isDirectory) return false;
      const name = path.basename(f.relativePath).toLowerCase();
      return name === 'schema.prisma' || name.startsWith('drizzle.config.') || name.startsWith('ormconfig.') || name === '.sequelizerc';
    });
    if (cleanConfig) {
      const name = path.basename(cleanConfig.relativePath).toLowerCase();
      if (name === 'schema.prisma') return 'Prisma';
      if (name.startsWith('drizzle.config.')) return 'Drizzle';
      if (name.startsWith('ormconfig.')) return 'TypeORM';
      if (name === '.sequelizerc') return 'Sequelize';
    }

    // Limit scanning to first 10 files to keep scan time extremely low
    for (const file of codeFiles.slice(0, 10)) {
      try {
        const fullPath = path.join(repoPath, file.relativePath);
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
      } catch {}
    }
    return null;
  }
}
