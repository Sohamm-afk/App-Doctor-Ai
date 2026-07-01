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

    // 2. Read package.json dependencies
    let packageJsonData: any = {};
    const packageJsonPath = scanResult.importantFiles.find((f) => f.endsWith('package.json'));
    if (packageJsonPath) {
      try {
        const fileContent = await fs.promises.readFile(path.join(repoPath, packageJsonPath), 'utf8');
        packageJsonData = JSON.parse(fileContent);
      } catch {
        // Suppress package.json reading exceptions
      }
    }

    const deps = {
      ...(packageJsonData.dependencies || {}),
      ...(packageJsonData.devDependencies || {}),
    };

    // 2a. Frontend frameworks detection
    if (deps['react'] || deps['react-dom']) frontend = 'React';
    if (deps['next']) frontend = 'Next.js';
    if (deps['vue']) frontend = 'Vue';
    if (deps['@angular/core']) frontend = 'Angular';
    if (deps['svelte'] || deps['@sveltejs/kit']) frontend = 'Svelte';
    if (deps['nuxt']) frontend = 'Nuxt';

    if (!frontend) {
      if (scanResult.importantFiles.some((f) => f.includes('next.config'))) frontend = 'Next.js';
      else if (scanResult.importantFiles.some((f) => f.includes('nuxt.config'))) frontend = 'Nuxt';
    }

    // 2b. JavaScript backend frameworks
    if (deps['express']) backend = 'Express';
    if (deps['@nestjs/core']) backend = 'NestJS';

    // 3. Python backend framework detection
    let pyDeps = '';
    const reqsTxtPath = scanResult.importantFiles.find((f) => f.endsWith('requirements.txt'));
    if (reqsTxtPath) {
      try {
        pyDeps = await fs.promises.readFile(path.join(repoPath, reqsTxtPath), 'utf8');
      } catch {}
    }
    const pyProjectTomlPath = scanResult.importantFiles.find((f) => f.endsWith('pyproject.toml'));
    if (pyProjectTomlPath) {
      try {
        pyDeps += '\n' + (await fs.promises.readFile(path.join(repoPath, pyProjectTomlPath), 'utf8'));
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
    const allDepKeys = Object.keys(deps).join(' ').toLowerCase() + ' ' + pyDeps.toLowerCase();
    if (allDepKeys.includes('mongoose') || allDepKeys.includes('mongodb') || allDepKeys.includes('pymongo')) {
      database = 'MongoDB';
    } else if (allDepKeys.includes('pg') || allDepKeys.includes('postgres') || allDepKeys.includes('psycopg')) {
      database = 'PostgreSQL';
    } else if (allDepKeys.includes('mysql') || allDepKeys.includes('mysql2')) {
      database = 'MySQL';
    } else if (allDepKeys.includes('sqlite') || allDepKeys.includes('sqlite3')) {
      database = 'SQLite';
    } else if (allDepKeys.includes('firebase')) {
      database = 'Firebase';
    } else if (allDepKeys.includes('supabase')) {
      database = 'Supabase';
    } else if (allDepKeys.includes('redis') || allDepKeys.includes('ioredis')) {
      database = 'Redis';
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
    } else if (packageJsonPath) {
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
      database,
      packageManager,
      deployment,
      ciCd,
    };
  }
}
