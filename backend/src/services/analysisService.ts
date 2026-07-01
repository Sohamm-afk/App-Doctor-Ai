import fs from 'fs';
import path from 'path';
import {
  ScanResult, TechnologyInfo, SecurityFinding, QualityFinding,
  PerformanceFinding, DeploymentFinding, ArchitectureMetadata,
  LaunchScoreBreakdown, AnalysisResponse, RepositoryMetadata
} from '../types';

export class AnalysisService {
  /**
   * Helper to recursively discover all files within the repository.
   * Skips VCS and binary dependency folders.
   */
  private static async getFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        const nameLower = dirent.name.toLowerCase();

        // Standard build/VCS ignore list
        if (
          nameLower === 'node_modules' ||
          nameLower === 'dist' ||
          nameLower === 'build' ||
          nameLower === 'coverage' ||
          nameLower === '.git' ||
          nameLower === 'venv' ||
          nameLower === '.venv' ||
          nameLower === '__pycache__' ||
          nameLower === '.ds_store'
        ) {
          return [];
        }

        return dirent.isDirectory() ? this.getFilesRecursive(res, baseDir) : res;
      })
    );
    return Array.prototype.concat(...files);
  }

  /**
   * Performs the static code review and quality checks against the cloned repo files.
   */
  public static async analyze(
    repoPath: string,
    scanResult: ScanResult,
    techInfo: TechnologyInfo
  ): Promise<Omit<AnalysisResponse, 'metadata' | 'technology'>> {
    const securityFindings: SecurityFinding[] = [];
    const qualityFindings: QualityFinding[] = [];
    const performanceFindings: PerformanceFinding[] = [];
    const deploymentFindings: DeploymentFinding[] = [];

    // State indicators
    let hasHelmet = false;
    let hasRateLimit = false;
    let hasExpress = false;
    let hasNest = false;
    let hasDjango = false;
    let hasFlask = false;
    let hasFastApi = false;
    let hasSpring = false;
    let hasCompression = false;
    let hasLazyLoading = false;

    let hasReadme = false;
    let hasLicense = false;
    let hasTests = false;
    let hasEslint = false;
    let hasPrettier = false;
    let hasTsConfig = false;

    let hasDockerfile = false;
    let hasDockerCompose = false;
    let hasGithubWorkflows = false;
    let hasVercelJson = false;
    let hasNetlifyToml = false;
    let hasRenderYaml = false;
    let hasRailwayToml = false;
    let hasK8s = false;

    // Retrieve file list
    let files: string[] = [];
    try {
      files = await this.getFilesRecursive(repoPath, repoPath);
    } catch (err) {
      console.error('[AnalysisService] Failed file traversal:', err);
    }

    // Inspect files and gather evidence
    for (const filePath of files) {
      const relPath = path.relative(repoPath, filePath).replace(/\\/g, '/');
      const fileLower = path.basename(filePath).toLowerCase();
      const ext = path.extname(filePath).toLowerCase();

      // Flag checks based on file presence
      if (fileLower === 'readme.md') hasReadme = true;
      if (fileLower === 'license' || fileLower === 'license.txt') hasLicense = true;
      if (fileLower.includes('.test.') || fileLower.includes('.spec.') || relPath.includes('test/') || relPath.includes('tests/')) hasTests = true;
      if (fileLower.startsWith('.eslintrc') || fileLower === 'eslint.config.js') hasEslint = true;
      if (fileLower.startsWith('.prettierrc') || fileLower === 'prettier.config.js') hasPrettier = true;
      if (fileLower === 'tsconfig.json') hasTsConfig = true;

      if (fileLower === 'dockerfile') hasDockerfile = true;
      if (fileLower === 'docker-compose.yml' || fileLower === 'docker-compose.yaml') hasDockerCompose = true;
      if (relPath.startsWith('.github/workflows')) hasGithubWorkflows = true;
      if (fileLower === 'vercel.json') hasVercelJson = true;
      if (fileLower === 'netlify.toml') hasNetlifyToml = true;
      if (fileLower === 'render.yaml') hasRenderYaml = true;
      if (fileLower === 'railway.toml' || fileLower === 'railway.json') hasRailwayToml = true;
      if (relPath.includes('k8s/') || fileLower.endsWith('.k8s.yaml')) hasK8s = true;

      // Skip analysis for large or non-code files
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.size > 500 * 1024) continue; // Skip files > 500KB to ensure fast scanning

        // Analyze code contents for text extensions
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.go', '.rs', '.json', '.yml', '.yaml', '.xml'].includes(ext)) {
          const content = await fs.promises.readFile(filePath, 'utf8');

          // Global framework flags detection from code contents
          if (content.includes('express') || content.includes("require('express')")) hasExpress = true;
          if (content.includes('@nestjs/core')) hasNest = true;
          if (content.includes('django') || content.includes('django.db')) hasDjango = true;
          if (content.includes('flask')) hasFlask = true;
          if (content.includes('fastapi')) hasFastApi = true;
          if (content.includes('springframework')) hasSpring = true;

          if (content.includes('helmet') || content.includes("require('helmet')")) hasHelmet = true;
          if (content.includes('express-rate-limit') || content.includes('rateLimit(')) hasRateLimit = true;
          if (content.includes('compression') || content.includes('compression(')) hasCompression = true;
          if (content.includes('React.lazy') || content.includes('lazy(')) hasLazyLoading = true;

          // Line-by-line security heuristic scans
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i] || '';
            const lineNum = i + 1;

            // 1. eval() RCE vulnerabilities
            if (line.includes('eval(') && !line.includes('//') && !line.includes('/*')) {
              securityFindings.push({
                title: 'Dangerous eval() Usage',
                severity: 'critical',
                description: 'The eval() function executes arbitrary strings as code, presenting a severe Remote Code Execution (RCE) risk.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 2. shell execution injection
            if ((line.includes('exec(') || line.includes('execSync(')) && 
                (line.includes('`') || line.includes('+') || line.includes('${')) &&
                !line.includes('//')) {
              securityFindings.push({
                title: 'Dangerous child_process.exec() Usage',
                severity: 'critical',
                description: 'Executing shell commands with dynamic string concatenation is highly vulnerable to Command Injection.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'medium',
              });
            }

            // 3. Permissive CORS configuration
            if ((line.includes("origin: '*'") || line.includes('origin: "*"') || line.includes('Access-Control-Allow-Origin: "*"') || line.includes("Access-Control-Allow-Origin: '*'")) && !line.includes('//')) {
              securityFindings.push({
                title: 'Permissive CORS Configuration',
                severity: 'high',
                description: 'CORS settings are configured to allow unrestricted cross-origin requests ("*"), creating potential security exploits.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 4. Hardcoded Cryptographic Secrets
            const jwtSecretRegex = /(jwt[_-]?secret|session[_-]?secret|private[_-]?key|aws[_-]?secret|api[_-]?secret)\s*[:=]\s*['"`]([a-zA-Z0-9\/+=_\-!@#$]{8,})['"`]/i;
            const jwtMatch = line.match(jwtSecretRegex);
            if (jwtMatch && !line.includes('process.env') && !line.includes('//')) {
              securityFindings.push({
                title: 'Hardcoded Cryptographic Secret',
                severity: 'critical',
                description: 'Sensitive signature keys or environment secrets are hardcoded in the codebase, presenting major credential leakage risks.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 5. Hardcoded API Credentials
            const apiKeyRegex = /(api[_-]?key|client[_-]?secret|stripe[_-]?key|sendgrid[_-]?key)\s*[:=]\s*['"`]([a-zA-Z0-9_-]{16,})['"`]/i;
            const keyMatch = line.match(apiKeyRegex);
            if (keyMatch && !line.includes('process.env') && !line.includes('//')) {
              securityFindings.push({
                title: 'Hardcoded API Key Credential',
                severity: 'high',
                description: 'Third-party API key credential was found hardcoded, making it vulnerable to source leak compromise.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 6. Hardcoded plaintext passwords
            const passwordRegex = /(db[_-]?password|password|passphrase|mysql[_-]?password)\s*[:=]\s*['"`]([a-zA-Z0-9_\-!@#$]{5,})['"`]/i;
            const passMatch = line.match(passwordRegex);
            if (passMatch && !line.includes('process.env') && !line.includes('//')) {
              securityFindings.push({
                title: 'Hardcoded Plaintext Password',
                severity: 'critical',
                description: 'Database or user credential password found in plaintext inside repository source code.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 7. Debug configurations
            if (ext === '.py' && line.match(/^\s*DEBUG\s*=\s*True\b/i)) {
              securityFindings.push({
                title: 'Debug Mode Enabled in Python Configuration',
                severity: 'high',
                description: 'Python debug configurations (e.g. Django DEBUG) are set to True, which exposes detailed system stack traces to users.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'high',
              });
            }

            // 8. Insecure Cookie Settings
            if ((line.includes('cookie(') || line.includes('cookies.set(')) && 
                !line.includes('secure: true') && 
                !line.includes('//')) {
              securityFindings.push({
                title: 'Insecure Cookie Configuration',
                severity: 'medium',
                description: 'Session cookies configured without the secure flag can be intercepted over unencrypted HTTP channels.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'medium',
              });
            }

            // 9. Multer File upload size limit warnings
            if (line.includes('multer(') && !content.includes('limits:') && !line.includes('//')) {
              securityFindings.push({
                title: 'Unrestricted File Upload Configuration',
                severity: 'high',
                description: 'Multer upload initialization does not specify custom file size limits, risking Denial of Service (DoS) attacks via oversized payloads.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence: 'medium',
              });
            }
          }
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    // Server-wide heuristic warnings
    const serverActive = hasExpress || hasNest || hasDjango || hasFlask || hasFastApi || hasSpring || techInfo.backend;
    if (serverActive) {
      if (!hasHelmet && (hasExpress || hasNest)) {
        securityFindings.push({
          title: 'Missing Security Headers (Helmet)',
          severity: 'high',
          description: 'The Node.js server does not register Helmet middleware to protect HTTP response headers.',
          evidence: 'No import or use of helmet middleware detected.',
          file: 'package.json',
          lineNumber: 1,
          confidence: 'high',
        });
      }
      if (!hasRateLimit && (hasExpress || hasNest)) {
        securityFindings.push({
          title: 'Missing API Rate Limiting',
          severity: 'medium',
          description: 'The server endpoints do not register rate limit policies, rendering them vulnerable to brute-force or Denial of Service.',
          evidence: 'No rate limiting middleware detected in packages manifest.',
          file: 'package.json',
          lineNumber: 1,
          confidence: 'high',
        });
      }
      if (!hasCompression && (hasExpress || hasNest)) {
        performanceFindings.push({
          title: 'Missing Response Compression',
          severity: 'medium',
          description: 'Gzip/Brotli compression middleware is not registered on the Express server, resulting in larger network transfer payloads.',
          file: 'package.json',
          impact: 'Medium',
        });
      }
    }

    // Check missing environment template
    const hasEnv = scanResult.importantFiles.some((f) => f.endsWith('.env'));
    const hasEnvTemplate = scanResult.importantFiles.some((f) => f.endsWith('.env.example') || f.endsWith('.env.template'));
    if (hasEnv && !hasEnvTemplate) {
      securityFindings.push({
        title: 'Missing Environment Configuration Template',
        severity: 'medium',
        description: 'The workspace contains local environment configurations (.env) but is missing an environment configuration template (.env.example).',
        evidence: 'Found .env without matching template .env.example',
        file: '.gitignore',
        lineNumber: 1,
        confidence: 'high',
      });
    }

    // Quality Findings compilations
    if (!hasReadme) {
      qualityFindings.push({
        title: 'Missing Documentation (README)',
        severity: 'medium',
        description: 'The repository does not contain a README.md file, which is essential for onboarding and usage instructions.',
        file: 'README.md',
      });
    }
    if (!hasLicense) {
      qualityFindings.push({
        title: 'Missing Open Source LICENSE',
        severity: 'low',
        description: 'No LICENSE file was found, which might restrict other developers from legally using or contributing to the codebase.',
        file: 'LICENSE',
      });
    }
    if (!hasTests) {
      qualityFindings.push({
        title: 'Missing Automated Tests Suite',
        severity: 'high',
        description: 'No test files (.test.ts, .spec.ts, .test.js, or tests/ folder) were discovered. Automated validation checks are highly recommended.',
        file: 'package.json',
      });
    }
    if (!hasEslint) {
      qualityFindings.push({
        title: 'Missing Linter Configuration (ESLint)',
        severity: 'low',
        description: 'ESLint configuration is missing. Code styling and static syntax validation checks will not be enforced.',
        file: 'package.json',
      });
    }
    if (!hasPrettier) {
      qualityFindings.push({
        title: 'Missing Formatter Configuration (Prettier)',
        severity: 'low',
        description: 'Prettier formatter configurations are missing. Consistent formatting is not enforced in the codebase.',
        file: 'package.json',
      });
    }
    if (scanResult.extensions['.ts'] || scanResult.extensions['.tsx']) {
      if (!hasTsConfig) {
        qualityFindings.push({
          title: 'TypeScript missing tsconfig.json',
          severity: 'medium',
          description: 'TypeScript code is present but no tsconfig.json was found to define compile-time rules.',
          file: 'package.json',
        });
      }
    }

    // Check for giant asset files (> 2MB)
    scanResult.largestFiles.forEach((f) => {
      if (f.size > 2 * 1024 * 1024) {
        qualityFindings.push({
          title: 'Oversized Code or Asset File',
          severity: 'medium',
          description: `File '${f.path}' is ${Math.round((f.size / (1024 * 1024)) * 10) / 10}MB. Giant assets should be moved to external storage or CDN.`,
          file: f.path,
        });

        // Image performance warning
        const ext = path.extname(f.path).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
          performanceFindings.push({
            title: 'Unoptimized Image Asset',
            severity: 'low',
            description: `Image asset '${f.path}' exceeds 2MB. Consider using tinypng/webp formats to reduce load latency.`,
            file: f.path,
            impact: 'Low',
          });
        }
      }
    });

    // Lazy loading react performance hint
    if (techInfo.frontend === 'React' && !hasLazyLoading) {
      performanceFindings.push({
        title: 'Missing Component Lazy Loading',
        severity: 'low',
        description: 'React components are loaded synchronously instead of using React.lazy(), resulting in larger initial client bundles.',
        file: 'src/App.tsx',
        impact: 'Low',
      });
    }

    // Deployment Findings compilations
    if (hasDockerfile) deploymentFindings.push({ title: 'Docker Containerization', type: 'Docker', configPath: 'Dockerfile' });
    if (hasDockerCompose) deploymentFindings.push({ title: 'Multi-Container Orchestration', type: 'Docker Compose', configPath: 'docker-compose.yml' });
    if (hasGithubWorkflows) deploymentFindings.push({ title: 'GitHub Actions CI/CD Pipeline', type: 'CI/CD', configPath: '.github/workflows' });
    if (hasVercelJson) deploymentFindings.push({ title: 'Vercel Deployment Configuration', type: 'Hosting', configPath: 'vercel.json' });
    if (hasNetlifyToml) deploymentFindings.push({ title: 'Netlify Static Hosting Config', type: 'Hosting', configPath: 'netlify.toml' });
    if (hasRenderYaml) deploymentFindings.push({ title: 'Render Hosting Stack', type: 'Hosting', configPath: 'render.yaml' });
    if (hasRailwayToml) deploymentFindings.push({ title: 'Railway Hosting Stack', type: 'Hosting', configPath: 'railway.json' });
    if (hasK8s) deploymentFindings.push({ title: 'Kubernetes Cluster Deployment', type: 'Orchestration', configPath: 'k8s/' });

    // Architecture Classifier
    let pattern: ArchitectureMetadata['pattern'] = 'Unknown';
    let archType = 'Library / Utility';

    const pathString = files.join('\n').toLowerCase();
    const hasControllers = pathString.includes('/controllers/') || pathString.includes('/controller/');
    const hasModels = pathString.includes('/models/') || pathString.includes('/model/');
    const hasViews = pathString.includes('/views/') || pathString.includes('/view/');

    if (techInfo.frontend && techInfo.backend) {
      pattern = 'Monolith';
      archType = 'Full Stack Web Monolith';
    } else if (techInfo.frontend) {
      pattern = 'Monolith';
      archType = 'SPA / Frontend Client';
    } else if (techInfo.backend) {
      if (hasControllers && hasModels && hasViews) {
        pattern = 'MVC';
        archType = 'Model-View-Controller API Backend';
      } else {
        pattern = 'Layered';
        archType = 'Layered Architecture Backend';
      }
    }

    if (scanResult.importantFiles.filter((f) => f.endsWith('package.json')).length > 2) {
      pattern = 'Microservices';
      archType = 'Monorepo / Microservices Federation';
    }

    // Build dynamic ReactFlow Architecture Graph
    const nodes = [
      { id: 'node-client', label: 'Client App', type: 'client', position: { x: 100, y: 150 }, data: { technology: techInfo.frontend || 'Web Browser' } },
      { id: 'node-gateway', label: 'API Gateway', type: 'gateway', position: { x: 300, y: 150 }, data: { technology: 'Vite Proxy / CORS' } },
      { id: 'node-service', label: 'Backend API', type: 'service', position: { x: 500, y: 150 }, data: { technology: techInfo.backend || 'Runtime Service', health: securityFindings.length > 3 ? 'warning' : 'healthy' } },
    ];
    const edges = [
      { id: 'edge-client-gateway', source: 'node-client', target: 'node-gateway', label: 'HTTPS' },
      { id: 'edge-gateway-service', source: 'node-gateway', target: 'node-service', label: 'Proxy' },
    ];

    if (techInfo.database) {
      nodes.push({
        id: 'node-database',
        label: 'Database Store',
        type: 'database',
        position: { x: 700, y: 150 },
        data: { technology: techInfo.database },
      });
      edges.push({
        id: 'edge-service-db',
        source: 'node-service',
        target: 'node-database',
        label: 'Driver',
      });
    }

    const architecture: ArchitectureMetadata = {
      pattern,
      type: archType,
      nodes,
      edges,
    };

    // Calculate Dynamic deterministic score
    const score = this.calculateScore(
      securityFindings,
      hasReadme,
      hasTests,
      hasDockerfile || hasDockerCompose,
      hasGithubWorkflows,
      scanResult.fileCount
    );

    return {
      security_findings: securityFindings,
      quality_findings: qualityFindings,
      performance_findings: performanceFindings,
      deployment_findings: deploymentFindings,
      architecture,
      launch_score: score,
    };
  }

  /**
   * Evaluates a deterministic Launch Score based on penalties/rewards
   */
  private static calculateScore(
    security: SecurityFinding[],
    hasReadme: boolean,
    hasTests: boolean,
    hasDocker: boolean,
    hasCicd: boolean,
    fileCount: number
  ): LaunchScoreBreakdown {
    let overall = 100;

    // 1. Rewards
    if (hasReadme) overall += 2;
    if (hasTests) overall += 8;
    if (hasDocker) overall += 5;
    if (hasCicd) overall += 5;

    // 2. Penalties
    let securityPenalty = 0;
    security.forEach((s) => {
      if (s.severity === 'critical') securityPenalty += 15;
      else if (s.severity === 'high') securityPenalty += 10;
      else if (s.severity === 'medium') securityPenalty += 6;
      else if (s.severity === 'low') securityPenalty += 4;
    });

    overall -= securityPenalty;

    // Bound check
    if (overall > 100) overall = 100;
    if (overall < 0) overall = 0;

    // Unique offset using file trait
    const offset = fileCount % 5;
    overall = Math.max(0, Math.min(100, overall - offset));

    // Distribute breakdown
    const securityScore = Math.max(0, 100 - securityPenalty * 3);
    const performanceScore = hasTests ? 92 : 80;
    const qualityScore = Math.max(0, 100 - (hasReadme ? 0 : 20) - (hasTests ? 0 : 30));
    const cloudScore = hasDocker ? 95 : 75;

    return {
      overall,
      security: securityScore,
      performance: performanceScore,
      quality: qualityScore,
      cloud: cloudScore,
    };
  }
}
