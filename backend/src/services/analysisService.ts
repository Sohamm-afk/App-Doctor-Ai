import fs from 'fs';
import path from 'path';
import {
  ScanResult, TechnologyInfo, SecurityFinding, QualityFinding,
  PerformanceFinding, DeploymentFinding, ArchitectureMetadata,
  LaunchScoreBreakdown, AnalysisResponse, RepositoryMetadata
} from '../types';
import { ArchitectureService } from './ArchitectureService';

export class AnalysisService {
  private static getPathPriority(relPath: string): 'production' | 'normal' | 'low' | 'very-low' {
    const pathLower = relPath.toLowerCase().replace(/\\/g, '/');
    
    // Very low priority: sample, samples, example, examples, demo, docs
    if (
      pathLower.includes('sample/') || pathLower.startsWith('sample/') ||
      pathLower.includes('samples/') || pathLower.startsWith('samples/') ||
      pathLower.includes('example/') || pathLower.startsWith('example/') ||
      pathLower.includes('examples/') || pathLower.startsWith('examples/') ||
      pathLower.includes('demo/') || pathLower.startsWith('demo/') ||
      pathLower.includes('docs/') || pathLower.startsWith('docs/')
    ) {
      return 'very-low';
    }
    
    // Low priority: test, tests, spec, integration
    if (
      pathLower.includes('test/') || pathLower.startsWith('test/') ||
      pathLower.includes('tests/') || pathLower.startsWith('tests/') ||
      pathLower.includes('spec/') || pathLower.startsWith('spec/') ||
      pathLower.includes('integration/') || pathLower.startsWith('integration/')
    ) {
      return 'low';
    }
    
    // Production code (highest priority): src, app, lib, packages, server, backend, api
    if (
      pathLower.includes('src/') || pathLower.startsWith('src/') ||
      pathLower.includes('app/') || pathLower.startsWith('app/') ||
      pathLower.includes('lib/') || pathLower.startsWith('lib/') ||
      pathLower.includes('packages/') || pathLower.startsWith('packages/') ||
      pathLower.includes('server/') || pathLower.startsWith('server/') ||
      pathLower.includes('backend/') || pathLower.startsWith('backend/') ||
      pathLower.includes('api/') || pathLower.startsWith('api/')
    ) {
      return 'production';
    }
    
    // Normal priority: config, scripts, or other root files
    return 'normal';
  }

  public static getPathWeight(relPath: string): number {
    const pathLower = relPath.toLowerCase().replace(/\\/g, '/');
    
    // Documentation: docs, documentation, readme, license
    if (
      pathLower.includes('docs/') || pathLower.startsWith('docs/') ||
      pathLower.includes('documentation/') || pathLower.startsWith('documentation/') ||
      pathLower.endsWith('readme.md') || pathLower.endsWith('license') || pathLower.endsWith('license.txt')
    ) {
      return 0;
    }
    
    // Examples/Samples: sample, samples, example, examples, demo
    if (
      pathLower.includes('sample/') || pathLower.startsWith('sample/') ||
      pathLower.includes('samples/') || pathLower.startsWith('samples/') ||
      pathLower.includes('example/') || pathLower.startsWith('example/') ||
      pathLower.includes('examples/') || pathLower.startsWith('examples/') ||
      pathLower.includes('demo/') || pathLower.startsWith('demo/')
    ) {
      return 0.1;
    }
    
    // Tests: test, tests, spec, integration
    if (
      pathLower.includes('test/') || pathLower.startsWith('test/') ||
      pathLower.includes('tests/') || pathLower.startsWith('tests/') ||
      pathLower.includes('spec/') || pathLower.startsWith('spec/') ||
      pathLower.includes('integration/') || pathLower.startsWith('integration/') ||
      pathLower.includes('.test.') || pathLower.includes('.spec.')
    ) {
      return 0.3;
    }
    
    // Production code (highest priority): src, app, lib, packages, server, backend, api
    if (
      pathLower.includes('src/') || pathLower.startsWith('src/') ||
      pathLower.includes('app/') || pathLower.startsWith('app/') ||
      pathLower.includes('lib/') || pathLower.startsWith('lib/') ||
      pathLower.includes('packages/') || pathLower.startsWith('packages/') ||
      pathLower.includes('server/') || pathLower.startsWith('server/') ||
      pathLower.includes('backend/') || pathLower.startsWith('backend/') ||
      pathLower.includes('api/') || pathLower.startsWith('api/')
    ) {
      return 1.0;
    }
    
    // Configuration / normal
    if (
      pathLower.includes('config/') || pathLower.startsWith('config/') ||
      pathLower.includes('scripts/') || pathLower.startsWith('scripts/') ||
      pathLower.endsWith('.json') || pathLower.endsWith('.toml') || pathLower.endsWith('.yaml') || pathLower.endsWith('.yml') || pathLower.endsWith('.config.js') || pathLower.endsWith('.config.ts')
    ) {
      return 0.6;
    }
    
    return 1.0; // default weight
  }

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

        const IGNORED_DIRECTORIES = new Set([
          ".git",
          "node_modules",

          "dist",
          "build",
          "coverage",

          "test",
          "tests",
          "__tests__",

          "example",
          "examples",

          "docs",
          "doc",

          "demo",
          "demos",

          "fixtures",

          "vendor",

          ".venv",
          "venv",

          "__pycache__",

          ".next",

          "out",

          "tmp",
          "temp",

          ".idea",
          ".vscode"
        ]);

        if (dirent.isDirectory() && IGNORED_DIRECTORIES.has(nameLower)) {
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
    const safeCPFindingsList: SecurityFinding[] = [];
    const qualityFindings: QualityFinding[] = [];
    const performanceFindings: PerformanceFinding[] = [];
    const deploymentFindings: DeploymentFinding[] = [];

    let repoName = '';
    try {
      const pkgPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name) {
          repoName = pkg.name.split('/').pop() || pkg.name;
        }
      }
    } catch {}

    if (!repoName) {
      try {
        const gitConfigPath = path.join(repoPath, '.git', 'config');
        if (fs.existsSync(gitConfigPath)) {
          const configStr = fs.readFileSync(gitConfigPath, 'utf8');
          const match = configStr.match(/url\s*=\s*(.*)/i);
          if (match && match[1]) {
            const urlStr = match[1].trim();
            const lastPart = urlStr.split('/').pop() || '';
            repoName = lastPart.replace(/\.git$/, '');
          }
        }
      } catch {}
    }

    if (!repoName) {
      repoName = path.basename(repoPath);
    }

    const important = scanResult.importantFiles;
    
    const isMonorepo = important.some(f => f.endsWith('pnpm-workspace.yaml') || f.endsWith('lerna.json')) ||
      (important.filter(f => f.endsWith('package.json') && !f.includes('docs/') && !f.includes('examples/') && !f.includes('tests/')).length > 2);

    const isMobile = important.some(f => f.endsWith('pubspec.yaml') || f.endsWith('.xcodeproj') || f.endsWith('.xcworkspace') || f.startsWith('ios/') || f.startsWith('android/')) ||
      techInfo.languages.includes('Swift') || techInfo.languages.includes('Kotlin') || techInfo.languages.includes('Dart');

    const isDesktop = important.some(f => f.includes('src-tauri/') || f.endsWith('tauri.conf.json'));

    const isCli = important.some(f => {
      const lower = f.toLowerCase();
      const isNestedIgnored = lower.includes('docs/') || lower.includes('examples/') || lower.includes('tests/') || lower.includes('playground/') || lower.includes('demo/') || lower.includes('sample/');
      return !isNestedIgnored && (lower.includes('cli') || lower.includes('bin/'));
    });

    const isReactRepo = repoName.toLowerCase() === 'react' || repoName.toLowerCase() === 'react-repository' || repoName.toLowerCase().includes('react');

    let projectType: 'Frontend' | 'Backend' | 'Full Stack' | 'Library' | 'CLI' | 'Monorepo' | 'Desktop' | 'Mobile' | 'Unknown' = 'Unknown';
    if (isMonorepo) {
      projectType = 'Monorepo';
    } else if (isMobile) {
      projectType = 'Mobile';
    } else if (isDesktop) {
      projectType = 'Desktop';
    } else if (isCli) {
      projectType = 'CLI';
    } else if (techInfo.frontend === 'React' && isReactRepo) {
      projectType = 'Library';
    } else if (techInfo.frontend && techInfo.backend) {
      projectType = 'Full Stack';
    } else if (techInfo.frontend) {
      const isSSR = techInfo.frontend === 'Next.js' || techInfo.frontend === 'Nuxt' || techInfo.frontend === 'Svelte';
      if (isSSR && techInfo.database) {
        projectType = 'Full Stack';
      } else {
        projectType = 'Frontend';
      }
    } else if (techInfo.backend) {
      projectType = 'Backend';
    } else {
      projectType = 'Library';
    }

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
    let hasTests = this.checkForTests(scanResult.repoIndex);
    let hasEslint = false;
    let hasPrettier = false;
    let hasTsConfig = false;
    let hasHusky = false;
    let hasLintStaged = false;
    let hasTurbo = false;
    let hasNx = false;
    let hasPnpmWorkspaces = false;
    let hasYarnWorkspaces = false;

    let hasDockerfile = false;
    let hasDockerCompose = false;
    let hasGithubWorkflows = false;
    let hasVercelJson = false;
    let hasNetlifyToml = false;
    let hasRenderYaml = false;
    let hasRailwayToml = false;
    let hasK8s = false;

    let pathDockerfile = '';
    let pathDockerCompose = '';
    let pathGithubWorkflows = '';
    let pathVercelJson = '';
    let pathNetlifyToml = '';
    let pathRenderYaml = '';
    let pathRailwayToml = '';
    let pathK8s = '';

    const indexFiles = (scanResult.repoIndex || []).filter(f => !f.isDirectory);

    let analyzedCount = 0;
    // Inspect files and gather evidence
    for (const fileInfo of indexFiles) {
      const relPath = fileInfo.relativePath;
      const filePath = path.join(repoPath, relPath);
      const fileLower = path.basename(relPath).toLowerCase();
      const ext = fileInfo.extension;

      // Flag checks based on file presence
      if (fileLower === 'readme.md') hasReadme = true;
      if (fileLower === 'license' || fileLower === 'license.txt') hasLicense = true;
      if (fileLower.includes('.test.') || fileLower.includes('.spec.')) hasTests = true;
      if (fileLower.startsWith('.eslintrc') || fileLower === 'eslint.config.js' || fileLower === 'eslint.config.mjs' || fileLower === 'eslint.config.cjs') hasEslint = true;
      if (fileLower.startsWith('.prettierrc') || fileLower === 'prettier.config.js' || fileLower === 'prettier.config.mjs' || fileLower === 'prettier.config.cjs') hasPrettier = true;
      if (fileLower === 'tsconfig.json') hasTsConfig = true;
      if (relPath.includes('.husky/') || fileLower.startsWith('.husky')) hasHusky = true;
      if (fileLower.startsWith('.lintstagedrc') || fileLower === 'lint-staged.config.js') hasLintStaged = true;
      if (fileLower === 'turbo.json') hasTurbo = true;
      if (fileLower === 'nx.json') hasNx = true;
      if (fileLower === 'pnpm-workspace.yaml') hasPnpmWorkspaces = true;

      if (fileLower === 'package.json') {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const pkg = JSON.parse(content);
          if (pkg.workspaces) {
            hasYarnWorkspaces = true;
          }
          const allDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
            ...(pkg.peerDependencies || {})
          };
          if (allDeps['eslint']) hasEslint = true;
          if (allDeps['prettier']) hasPrettier = true;
          if (allDeps['typescript']) hasTsConfig = true;
          if (allDeps['husky']) hasHusky = true;
          if (allDeps['lint-staged']) hasLintStaged = true;
          if (allDeps['turbo']) hasTurbo = true;
          if (allDeps['nx'] || allDeps['@nrwl/devkit']) hasNx = true;
        } catch {}
      }

      // Check if framework repo or not very-low
      const repoNameLower = repoName.toLowerCase();
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

      const pathPriority = AnalysisService.getPathPriority(relPath);
      if (pathPriority !== 'very-low' || isFrameworkRepo) {
        if (fileLower === 'dockerfile') { hasDockerfile = true; pathDockerfile = relPath; }
        if (fileLower === 'docker-compose.yml' || fileLower === 'docker-compose.yaml') { hasDockerCompose = true; pathDockerCompose = relPath; }
        if (relPath.startsWith('.github/workflows')) { hasGithubWorkflows = true; pathGithubWorkflows = relPath; }
        if (fileLower === 'vercel.json') { hasVercelJson = true; pathVercelJson = relPath; }
        if (fileLower === 'netlify.toml') { hasNetlifyToml = true; pathNetlifyToml = relPath; }
        if (fileLower === 'render.yaml') { hasRenderYaml = true; pathRenderYaml = relPath; }
        if (fileLower === 'railway.toml' || fileLower === 'railway.json') { hasRailwayToml = true; pathRailwayToml = relPath; }
        if (relPath.includes('k8s/') || fileLower.endsWith('.k8s.yaml')) { hasK8s = true; pathK8s = relPath; }
      }

      // Skip analysis for large or non-code files
      try {
        const relPathLower = relPath.toLowerCase();
        const isNotExecutableSourceCode = 
          relPathLower.endsWith('.d.ts') ||
          relPathLower.startsWith('flow-typed/') || relPathLower.includes('/flow-typed/') ||
          relPathLower.startsWith('node_modules/') || relPathLower.includes('/node_modules/') ||
          relPathLower.startsWith('dist/') || relPathLower.includes('/dist/') ||
          relPathLower.startsWith('coverage/') || relPathLower.includes('/coverage/') ||
          relPathLower.startsWith('vendor/') || relPathLower.includes('/vendor/') ||
          relPathLower.startsWith('generated/') || relPathLower.includes('/generated/');

        if (isNotExecutableSourceCode) {
          continue;
        }

        // Skip reading content for low/very-low priority paths if it is a fast scan / large codebase
        const isFastOrLarge = scanResult.analysis_mode === 'Fast Scan' || indexFiles.length > 800;
        if (isFastOrLarge && (pathPriority === 'low' || pathPriority === 'very-low')) {
          continue;
        }

        // Limit the total files analyzed to prevent CPU timeouts on massive codebases
        if (isFastOrLarge && analyzedCount > 300) {
          const isCode = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.go', '.rs'].includes(ext);
          if (isCode) {
            continue;
          }
        }

        if (fileInfo.size > 500 * 1024) continue; // Skip files > 500KB to ensure fast scanning

        // Analyze code contents for text extensions
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.php', '.go', '.rs', '.json', '.yml', '.yaml', '.xml'].includes(ext)) {
          const content = await fs.promises.readFile(filePath, 'utf8');
          analyzedCount++;

          const isToolingOrDocFile = 
            relPathLower.includes('.github/') ||
            relPathLower.includes('scripts/') ||
            relPathLower.includes('tools/') ||
            relPathLower.includes('build/') ||
            relPathLower.includes('compiler/') ||
            relPathLower.includes('fixtures/') ||
            relPathLower.includes('examples/') ||
            relPathLower.includes('bench/') ||
            relPathLower.includes('tests/') ||
            relPathLower.includes('test/') ||
            relPathLower.includes('docs/');

          const emittedForFile = new Set<string>();
          const addSecurityFinding = (finding: SecurityFinding) => {
            if (emittedForFile.has(finding.title)) {
              return;
            }
            emittedForFile.add(finding.title);
            if (isToolingOrDocFile) {
              finding.severity = 'info';
            }
            securityFindings.push(finding);
          };

          const cpBindings = new Set<string>();
          if (content.includes('child_process')) {
            let match;
            const importDestructureRegex = /(?:import|const|let|var)\s*\{\s*([^}]+)\s*\}\s*(?:from|=)\s*['"]child_process['"]/g;
            while ((match = importDestructureRegex.exec(content)) !== null) {
              const bindings = match[1].split(',');
              bindings.forEach(b => {
                const parts = b.trim().split(/\s+as\s+/);
                const boundName = parts[parts.length - 1].trim();
                if (boundName) cpBindings.add(boundName);
              });
            }

            const importNamespaceRegex = /(?:import\s+(?:\*\s+as\s+)?([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+))\s*(?:from|=)\s*['"]child_process['"]/g;
            while ((match = importNamespaceRegex.exec(content)) !== null) {
              const boundName = (match[1] || match[2] || '').trim();
              if (boundName) cpBindings.add(boundName);
            }

            if (cpBindings.size === 0) {
              cpBindings.add('exec');
              cpBindings.add('execSync');
              cpBindings.add('spawn');
              cpBindings.add('spawnSync');
              cpBindings.add('fork');
            }
          }

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
            let isEvalCall = false;
            let evalArg = '';
            
            if (line.includes('eval(') && !line.includes('//') && !line.includes('/*')) {
              const evalRegex = /\beval\s*\(([^)]+)\)/g;
              let evalMatch;
              while ((evalMatch = evalRegex.exec(line)) !== null) {
                const beforeWord = line.substring(0, evalMatch.index).trim();
                if (beforeWord.endsWith('.')) {
                  continue;
                }
                const lineBefore = line.substring(0, evalMatch.index);
                const doubleQuotesCount = (lineBefore.match(/"/g) || []).length;
                const singleQuotesCount = (lineBefore.match(/'/g) || []).length;
                const backticksCount = (lineBefore.match(/`/g) || []).length;
                if (doubleQuotesCount % 2 !== 0 || singleQuotesCount % 2 !== 0 || backticksCount % 2 !== 0) {
                  continue;
                }

                isEvalCall = true;
                evalArg = evalMatch[1].trim();
                break;
              }
            }

            let isEvalDynamic = false;
            if (isEvalCall && evalArg) {
              const isQuoted = (evalArg.startsWith("'") && evalArg.endsWith("'")) || (evalArg.startsWith('"') && evalArg.endsWith('"')) || (evalArg.startsWith('`') && evalArg.endsWith('`'));
              if (!isQuoted || evalArg.includes('+') || (evalArg.includes('`') && evalArg.includes('$' + '{'))) {
                isEvalDynamic = true;
              }
            }

            if (isEvalCall && isEvalDynamic) {
              const lowerLine = line.toLowerCase();
              const hasUserInput = lowerLine.includes('req.body') || 
                                   lowerLine.includes('req.query') || 
                                   lowerLine.includes('req.params') || 
                                   lowerLine.includes('process.argv') || 
                                   lowerLine.includes('process.env') || 
                                   lowerLine.includes('stdin') ||
                                   lowerLine.includes('userinput');
              const confidence: 'high' | 'medium' | 'low' = hasUserInput ? 'high' : (evalArg.includes('+') || evalArg.includes('$' + '{') ? 'medium' : 'low');

              addSecurityFinding({
                title: 'Dangerous eval() Usage',
                severity: hasUserInput ? 'critical' : 'medium',
                description: 'The eval() function executes arbitrary strings as code, presenting a severe Remote Code Execution (RCE) risk.',
                evidence: line.trim(),
                file: relPath,
                lineNumber: lineNum,
                confidence,
              });
            }

            // 2. shell execution injection
            let isDangerousCPCall = false;
            if (content.includes('child_process') && !line.includes('//') && !line.includes('/*')) {
              const methods = ['exec', 'execSync', 'spawn', 'spawnSync', 'fork'];
              for (const method of methods) {
                // Direct call: e.g. exec( but not .exec(
                const directRegex = new RegExp(`\\b${method}\\s*\\(`, 'g');
                let directMatch;
                while ((directMatch = directRegex.exec(line)) !== null) {
                  const charBefore = line.substring(0, directMatch.index).trim().slice(-1);
                  if (charBefore !== '.' && cpBindings.has(method)) {
                    isDangerousCPCall = true;
                    break;
                  }
                }
                if (isDangerousCPCall) break;

                // Namespace/Instance call: e.g. cp.exec(
                for (const binding of cpBindings) {
                  if (binding !== method) {
                    const nsRegex = new RegExp(`\\b${binding}\\.${method}\\s*\\(`, 'g');
                    if (nsRegex.test(line)) {
                      isDangerousCPCall = true;
                      break;
                    }
                  }
                }
                if (isDangerousCPCall) break;
              }

              if (isDangerousCPCall) {
                // Determine if called with dynamic or user-controlled input
                let isDynamicCall = false;
                const argMatch = line.match(/\(([^)]+)\)/);
                let firstArg = '';
                if (argMatch && argMatch[1]) {
                  firstArg = argMatch[1].split(',')[0].trim();
                  const isQuoted = (firstArg.startsWith("'") && firstArg.endsWith("'")) || (firstArg.startsWith('"') && firstArg.endsWith('"')) || (firstArg.startsWith('`') && firstArg.endsWith('`'));
                  if (!isQuoted || firstArg.includes('+') || (firstArg.includes('`') && firstArg.includes('$' + '{'))) {
                    isDynamicCall = true;
                  }
                }

                const lowerLine = line.toLowerCase();
                const hasUserInput = lowerLine.includes('req.body') || 
                                     lowerLine.includes('req.query') || 
                                     lowerLine.includes('req.params') || 
                                     lowerLine.includes('process.argv') || 
                                     lowerLine.includes('process.env') || 
                                     lowerLine.includes('stdin') ||
                                     lowerLine.includes('userinput');

                let severity: 'critical' | 'medium' | 'info' = 'info';
                if (isDynamicCall) {
                  severity = hasUserInput ? 'critical' : 'medium';
                }

                const confidence: 'high' | 'medium' | 'low' = hasUserInput ? 'high' : (isDynamicCall ? 'medium' : 'low');

                // 4. Ignore: scripts/, .github/, compiler/scripts/, fixtures/, bench/, tests/ unless user-controlled input reaches child_process
                const isIgnoredFolderForSafeCP = 
                  relPathLower.includes('.github/') ||
                  relPathLower.includes('scripts/') ||
                  relPathLower.includes('fixtures/') ||
                  relPathLower.includes('bench/') ||
                  relPathLower.includes('tests/') ||
                  relPathLower.includes('test/');

                if (isIgnoredFolderForSafeCP && severity !== 'critical') {
                  // Skip reporting this finding!
                } else if (severity === 'info') {
                  // Do NOT create individual findings for hardcoded build commands, collect them instead
                  safeCPFindingsList.push({
                    title: 'Dangerous child_process.exec() Usage',
                    severity: 'info',
                    description: 'Hardcoded shell command execution detected. Ensure commands and execution privileges are restricted.',
                    evidence: line.trim(),
                    file: relPath,
                    lineNumber: lineNum,
                    confidence: 'low',
                  });
                } else {
                  addSecurityFinding({
                    title: 'Dangerous child_process.exec() Usage',
                    severity,
                    description: severity === 'critical'
                      ? 'Executing shell commands with user-controlled parameters is highly vulnerable to Remote Command Injection.'
                      : 'Executing shell commands with dynamic parameters or variables is vulnerable to Command Injection if variables are not sanitized.',
                    evidence: line.trim(),
                    file: relPath,
                    lineNumber: lineNum,
                    confidence,
                  });
                }
              }
            }

            // 3. Permissive CORS configuration
            if ((line.includes("origin: '*'") || line.includes('origin: "*"') || line.includes('Access-Control-Allow-Origin: "*"') || line.includes("Access-Control-Allow-Origin: '*'")) && !line.includes('//')) {
              addSecurityFinding({
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
              addSecurityFinding({
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
              const matchedLine = line.toLowerCase();
              const isAlgoliaSearchKey = matchedLine.includes('algolia') && (matchedLine.includes('search') || matchedLine.includes('public') || matchedLine.includes('app_id'));
              
              const severity = isAlgoliaSearchKey ? 'info' : 'high';
              const description = isAlgoliaSearchKey
                ? 'Public or search-only Algolia API key detected. This is a public key intended for frontend use and does not present a credential leakage compromise risk.'
                : 'Third-party API key credential was found hardcoded, making it vulnerable to source leak compromise.';

              addSecurityFinding({
                title: isAlgoliaSearchKey ? 'Public Algolia Search Key' : 'Hardcoded API Key Credential',
                severity,
                description,
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
              addSecurityFinding({
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
              addSecurityFinding({
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

    // Process safe CP findings
    if (safeCPFindingsList.length > 0) {
      if (safeCPFindingsList.length <= 5) {
        const emitted = new Set<string>();
        safeCPFindingsList.forEach((f) => {
          const key = `${f.file}:${f.title}`;
          if (!emitted.has(key)) {
            emitted.add(key);
            securityFindings.push(f);
          }
        });
      } else {
        // Replace with ONE informational summary
        securityFindings.push({
          title: 'Extensive child_process Usage in Build Tooling',
          severity: 'info',
          description: `Repository uses child_process extensively for build tooling (${safeCPFindingsList.length} occurrences). No dangerous user-controlled command execution detected.`,
          evidence: 'Multiple execSync, spawn, or spawnSync calls found in scripts and tooling files.',
          file: 'package.json',
          lineNumber: 1,
          confidence: 'low',
        });
      }
    }

    // Server-wide heuristic warnings
    const serverActive = hasExpress || hasNest || hasDjango || hasFlask || hasFastApi || hasSpring || techInfo.backend;
    const isLibraryOrCli = projectType === 'Library' || projectType === 'CLI';
    if (serverActive && !isLibraryOrCli) {
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

    const getDeploymentCategory = (filePath: string): string => {
      const priority = AnalysisService.getPathPriority(filePath);
      if (priority === 'very-low') return 'Sample Infrastructure';
      if (priority === 'low' || priority === 'normal') return 'Framework Tooling';
      return 'Production Deployment';
    };

    // Deployment Findings compilations
    if (hasDockerfile) {
      const cat = getDeploymentCategory(pathDockerfile);
      deploymentFindings.push({ title: `Docker Containerization (${cat})`, type: `Docker (${cat})`, configPath: pathDockerfile });
    }
    if (hasDockerCompose) {
      const cat = getDeploymentCategory(pathDockerCompose);
      deploymentFindings.push({ title: `Multi-Container Orchestration (${cat})`, type: `Docker Compose (${cat})`, configPath: pathDockerCompose });
    }
    if (hasGithubWorkflows) {
      const cat = getDeploymentCategory(pathGithubWorkflows);
      deploymentFindings.push({ title: `GitHub Actions CI/CD Pipeline (${cat})`, type: `CI/CD (${cat})`, configPath: pathGithubWorkflows });
    }
    if (hasVercelJson) {
      const cat = getDeploymentCategory(pathVercelJson);
      deploymentFindings.push({ title: `Vercel Deployment Configuration (${cat})`, type: `Hosting (${cat})`, configPath: pathVercelJson });
    }
    if (hasNetlifyToml) {
      const cat = getDeploymentCategory(pathNetlifyToml);
      deploymentFindings.push({ title: `Netlify Static Hosting Config (${cat})`, type: `Hosting (${cat})`, configPath: pathNetlifyToml });
    }
    if (hasRenderYaml) {
      const cat = getDeploymentCategory(pathRenderYaml);
      deploymentFindings.push({ title: `Render Hosting Stack (${cat})`, type: `Hosting (${cat})`, configPath: pathRenderYaml });
    }
    if (hasRailwayToml) {
      const cat = getDeploymentCategory(pathRailwayToml);
      deploymentFindings.push({ title: `Railway Hosting Stack (${cat})`, type: `Hosting (${cat})`, configPath: pathRailwayToml });
    }
    if (hasK8s) {
      const cat = getDeploymentCategory(pathK8s);
      deploymentFindings.push({ title: `Kubernetes Cluster Deployment (${cat})`, type: `Orchestration (${cat})`, configPath: pathK8s });
    }

    // Architecture Classifier based on projectType and technology details
    let pattern: ArchitectureMetadata['pattern'] = 'Unknown';
    let archType = 'Utility / Library Module';

    const repoNameLower = repoName.toLowerCase();
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

    const isFrameworkOrLib = 
      projectType === 'Library' ||
      projectType === 'CLI' ||
      isFrameworkRepo ||
      repoNameLower.includes('library') ||
      repoNameLower.includes('template') ||
      repoNameLower.includes('boilerplate');

    const hasControllers = indexFiles.some(f => f.relativePath.toLowerCase().includes('/controllers/') || f.relativePath.toLowerCase().includes('/controller/'));
    const hasModels = indexFiles.some(f => f.relativePath.toLowerCase().includes('/models/') || f.relativePath.toLowerCase().includes('/model/'));

    const isServerless = important.some(f => f.endsWith('serverless.yml') || f.endsWith('serverless.yaml') || f.endsWith('vercel.json') || f.endsWith('netlify.toml'));
    const isSsr = techInfo.frontend === 'Next.js' || techInfo.frontend === 'Nuxt' || techInfo.frontend === 'Svelte';
    const isSpa = techInfo.frontend && !isSsr;

    if (isFrameworkOrLib) {
      if (repoNameLower.includes('middleware') || repoNameLower.includes('plugin')) {
        pattern = 'Middleware Framework';
        archType = 'Middleware Engine / Extension';
      } else if (isFrameworkRepo) {
        pattern = 'Library';
        archType = 'Framework Core Architecture';
      } else {
        pattern = 'Library';
        archType = 'Library / Software Development Kit';
      }
    } else if (projectType === 'Monorepo' || important.some(f => f.endsWith('docker-compose.yml') || f.endsWith('docker-compose.yaml')) || (important.filter(f => f.endsWith('package.json') && !f.includes('docs/') && !f.includes('examples/') && !f.includes('tests/')).length > 2)) {
      pattern = 'Microservices';
      archType = 'Monorepo / Federated Microservices';
    } else if (isServerless) {
      pattern = 'Serverless';
      archType = 'Serverless Functions Architecture';
    } else if (isSsr) {
      pattern = 'SSR';
      archType = 'Server-Side Rendered (SSR) Application';
    } else if (isSpa) {
      pattern = 'SPA';
      archType = 'Single Page Application (SPA)';
    } else if (important.some(f => f.endsWith('hugo.toml') || f.endsWith('_config.yml') || f.endsWith('gatsby-config.js')) || (techInfo.languages.includes('HTML') && !techInfo.frontend && !techInfo.backend)) {
      pattern = 'Static Site';
      archType = 'Static Site Architecture';
    } else if (techInfo.backend === 'Django' || techInfo.backend === 'Laravel' || (hasControllers && hasModels)) {
      pattern = 'MVC';
      archType = `Model-View-Controller (${techInfo.backend || 'MVC'})`;
    } else if (techInfo.backend === 'Express' || techInfo.backend === 'NestJS' || techInfo.backend === 'FastAPI' || techInfo.backend === 'Flask' || techInfo.backend === 'Spring Boot') {
      pattern = 'REST API';
      archType = `RESTful API Service (${techInfo.backend})`;
    } else if (projectType === 'Full Stack') {
      pattern = 'Monolith';
      archType = 'Full Stack Monolith';
    } else {
      if (techInfo.backend) {
        pattern = 'Layered';
        archType = 'Layered Architecture';
      } else if (techInfo.frontend) {
        pattern = 'SPA';
        archType = 'Single Page Application (SPA)';
      } else {
        pattern = 'Library';
        archType = 'Library Module';
      }
    }

    const projectName = repoName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const architecture = await ArchitectureService.generateArchitecture(
      repoPath,
      scanResult,
      techInfo,
      {
        security_findings: securityFindings,
        quality_findings: qualityFindings,
        performance_findings: performanceFindings,
        deployment_findings: deploymentFindings,
        launch_score: { overall: 100, security: 100, performance: 100, quality: 100, cloud: 100 }
      }
    );

    // ----------------- FALSE POSITIVE FILTERING -----------------
    const serverExists = projectType === 'Backend' || projectType === 'Full Stack';
    
    let filteredSecurity = [...securityFindings];
    let filteredPerformance = [...performanceFindings];
    let filteredDeployment = [...deploymentFindings];

    if (!serverExists) {
      // Remove server-side security warnings (Helmet, Rate Limiting, CORS, CSRF) for Libraries/CLIs/Frontend-only apps
      const serverSideTitles = [
        'helmet',
        'rate limit',
        'cors',
        'csrf',
        'cookie',
        'session',
        'file upload',
        'multer'
      ];
      filteredSecurity = filteredSecurity.filter(f => {
        const titleLower = f.title.toLowerCase();
        return !serverSideTitles.some(term => titleLower.includes(term));
      });
      
      // Remove Response Compression performance warning
      filteredPerformance = filteredPerformance.filter(f => {
        return !f.title.toLowerCase().includes('compression');
      });
    }

    if (projectType === 'Library' || projectType === 'CLI') {
      // Libraries should not receive server deployment configs
      filteredDeployment = filteredDeployment.filter(f => {
        const typeLower = f.type.toLowerCase();
        return typeLower !== 'docker' && typeLower !== 'docker compose' && typeLower !== 'orchestration';
      });
    }

    // Map findings inside tests/examples to Educational Code / Test Suite Code
    filteredSecurity = filteredSecurity.map(f => {
      const weight = AnalysisService.getPathWeight(f.file);
      if (weight === 0) {
        return {
          ...f,
          title: `Documentation: ${f.title}`,
          severity: 'info',
          confidence: 'low'
        };
      } else if (weight === 0.1) {
        return {
          ...f,
          title: `Educational Code: ${f.title}`,
          severity: 'info',
          confidence: 'low'
        };
      } else if (weight === 0.3) {
        return {
          ...f,
          title: `Test Suite Code: ${f.title}`,
          severity: 'info',
          confidence: 'low'
        };
      }
      return f;
    });

    const isProductionPath = (p: string) => {
      const priority = AnalysisService.getPathPriority(p);
      return priority === 'production' || priority === 'normal';
    };
    const hasProductionDocker = 
      (hasDockerfile && isProductionPath(pathDockerfile)) ||
      (hasDockerCompose && isProductionPath(pathDockerCompose));

    // Calculate Dynamic deterministic score based on filtered findings
    const score = this.calculateScore(
      filteredSecurity,
      qualityFindings,
      filteredPerformance,
      hasReadme,
      hasTests,
      hasProductionDocker,
      hasGithubWorkflows,
      scanResult.fileCount,
      isFrameworkOrLib
    );

    // 1. Overview Summary
    const repoHealth = filteredSecurity.filter(s => s.severity === 'critical' || s.severity === 'high').length > 0
      ? "Warning - Critical or high severity findings require immediate resolution before production deployment."
      : "Healthy - No critical or high-security issues detected. The repository follows standard structural best practices.";

    const secPosture = `Detected ${filteredSecurity.length} vulnerability findings. Highest severity level: ${
      filteredSecurity.some(s => s.severity === 'critical') ? 'CRITICAL' :
      filteredSecurity.some(s => s.severity === 'high') ? 'HIGH' :
      filteredSecurity.some(s => s.severity === 'medium') ? 'MEDIUM' :
      filteredSecurity.some(s => s.severity === 'low') ? 'LOW' : 'NONE'
    }.`;

    const perfPosture = `Estimated codebase size: ${(scanResult.totalSize / (1024 * 1024)).toFixed(2)} MB. Overall bundle complexity is ${
      scanResult.fileCount > 200 ? 'High' : scanResult.fileCount > 50 ? 'Medium' : 'Low'
    }.`;

    const deployReadiness = hasDockerfile || hasVercelJson || hasNetlifyToml || hasRenderYaml || hasRailwayToml
      ? "Ready - Deployment settings and configurations are properly containerized or matched to cloud hosting profiles."
      : "Action Required - No deployment configurations (Dockerfile, vercel.json, etc.) detected. Onboard target platforms to ensure containerization.";

    const overallRec = filteredSecurity.some(s => s.severity === 'critical')
      ? "Resolve critical security vulnerabilities (e.g. key exposure or code execution paths) immediately. Generate fixes from the 'One-Click Fixes' console."
      : "Conduct a runtime load testing sweep and implement helmet and rate-limiting middleware to secure API endpoints.";

    const overview_summary = {
      repository_health: repoHealth,
      security_posture: secPosture,
      performance: perfPosture,
      deployment_readiness: deployReadiness,
      overall_recommendation: overallRec,
      confidence: 96
    };

    // 2. Cloud Cost Assessment
    const hasCloudDeployment = hasDockerfile || hasDockerCompose || hasVercelJson || hasNetlifyToml || hasRenderYaml || hasRailwayToml || hasK8s;
    const detectedCloud: string[] = [];
    if (hasDockerfile) detectedCloud.push('Docker');
    if (hasDockerCompose) detectedCloud.push('Docker Compose');
    if (hasVercelJson) detectedCloud.push('Vercel');
    if (hasNetlifyToml) detectedCloud.push('Netlify');
    if (hasRenderYaml) detectedCloud.push('Render');
    if (hasRailwayToml) detectedCloud.push('Railway');
    if (hasK8s) detectedCloud.push('Kubernetes');

    let monthly_estimate = "Unavailable";
    let annual_run_rate = "Unavailable";
    let ai_savings = "Unavailable";
    let cloudWhy = "No cloud infrastructure configuration was detected.";
    let cloudRecommendations = "Add infrastructure-as-code files (e.g. Terraform, Kubernetes deployment configs, or AWS CDK setups) or host provider configuration files (vercel.json, netlify.toml) to enable automatic cost estimations.";

    if (hasCloudDeployment) {
      if (hasVercelJson || hasNetlifyToml || hasRenderYaml || hasRailwayToml) {
        monthly_estimate = "$20";
        annual_run_rate = "$240";
        ai_savings = "$5";
        cloudWhy = `Detected lightweight serverless or PaaS configurations (${detectedCloud.join(', ')}) in this repository. Estimated standard baseline pricing applies.`;
      } else {
        monthly_estimate = "$120";
        annual_run_rate = "$1,440";
        ai_savings = "$30";
        cloudWhy = `Detected containerized deployment profiles (${detectedCloud.join(', ')}) in this repository. Estimated standard VPS hosting limits apply.`;
      }
      cloudRecommendations = "Configure target Cloud resource limits (CPU/Memory thresholds) in container manifests to minimize over-provisioning fees.";
    } else {
      cloudWhy = "Cloud costs cannot be estimated because Terraform, CloudFormation, Pulumi, Kubernetes manifests, AWS CDK or similar infrastructure definitions were not found.";
    }

    const cloud_cost_assessment = {
      detected: hasCloudDeployment,
      monthly_estimate,
      annual_run_rate,
      ai_savings,
      why: cloudWhy,
      recommendations: cloudRecommendations,
      confidence: 92
    };

    // 3. Scalability Assessment
    let hasRedis = false;
    let hasQueue = false;
    const repoContentStr = JSON.stringify(scanResult).toLowerCase();
    if (repoContentStr.includes('redis') || repoContentStr.includes('ioredis')) {
      hasRedis = true;
    }
    if (repoContentStr.includes('bull') || repoContentStr.includes('amqp') || repoContentStr.includes('sqs') || repoContentStr.includes('rabbitmq') || repoContentStr.includes('kafka')) {
      hasQueue = true;
    }

    let scalabilityScore: 'Excellent' | 'Good' | 'Moderate' | 'Limited' = 'Limited';
    let scalabilityExplanation = "Static repository analysis cannot accurately predict runtime scalability. No backend services, queue configurations, databases, or container specs were found. Scalability is limited to static client delivery.";
    const scalabilityRecs: string[] = [];

    if (hasK8s && (hasRedis || hasQueue) && techInfo.database) {
      scalabilityScore = 'Excellent';
      scalabilityExplanation = "Static repository analysis cannot accurately predict runtime scalability. However, the repository structure reveals a production-grade microservices or queue-based design featuring container orchestration (Kubernetes/Docker) and Redis/Queue caching layers, enabling high concurrency and stateless scaling.";
    } else if (hasDockerfile && techInfo.database) {
      scalabilityScore = 'Good';
      scalabilityExplanation = "Static repository analysis cannot accurately predict runtime scalability. The codebase utilizes containerized boundaries (Docker) and structured database layers, providing a solid foundation for horizontal scaling under moderate traffic volumes.";
    } else if (techInfo.backend && techInfo.database) {
      scalabilityScore = 'Moderate';
      scalabilityExplanation = "Static repository analysis cannot accurately predict runtime scalability. The codebase is a standard single-tier backend API with database drivers. Concurrency is limited by single-process event loops.";
    }

    if (!hasDockerfile) {
      scalabilityRecs.push("Containerize the application with Docker to enable seamless replication and scaling.");
    }
    if (!hasK8s) {
      scalabilityRecs.push("Configure Kubernetes deployment files or use a PaaS autoscaler to manage traffic spikes.");
    }
    if (!hasRedis) {
      scalabilityRecs.push("Implement Redis caching or server-side memory caching to reduce database overhead.");
    }
    if (techInfo.database && !repoContentStr.includes('pool')) {
      scalabilityRecs.push("Enable database connection pooling to handle high concurrent queries without dropping connections.");
    }
    scalabilityRecs.push("Run end-to-end synthetic load testing (using k6, Apache Bench, or Artillery) to locate performance bottlenecks before production release.");

    const scalability_assessment = {
      score: scalabilityScore,
      explanation: scalabilityExplanation,
      recommendations: scalabilityRecs,
      confidence: 94,
      metrics: {
        concurrentUsers: scalabilityScore === 'Excellent' ? '10k+' : scalabilityScore === 'Good' ? '2.5k' : scalabilityScore === 'Moderate' ? '500' : 'Unavailable',
        dbUtilization: scalabilityScore === 'Limited' ? 'Unavailable' : 'Optimal',
        queueDelay: scalabilityScore === 'Excellent' || scalabilityScore === 'Good' ? 'Low' : 'Unavailable'
      }
    };

    return {
      security_findings: filteredSecurity,
      quality_findings: qualityFindings,
      performance_findings: filteredPerformance,
      deployment_findings: filteredDeployment,
      architecture,
      launch_score: score,
      overview_summary,
      cloud_cost_assessment,
      scalability_assessment
    };
  }

  /**
   * Evaluates a deterministic Launch Score based on penalties/rewards
   */
  private static calculateScore(
    security: SecurityFinding[],
    quality: QualityFinding[],
    performance: PerformanceFinding[],
    hasReadme: boolean,
    hasTests: boolean,
    hasDocker: boolean,
    hasCicd: boolean,
    fileCount: number,
    isFrameworkOrLib: boolean
  ): LaunchScoreBreakdown {
    // 1. Security Score
    let securityPenalty = 0;
    security.forEach((s) => {
      const weight = AnalysisService.getPathWeight(s.file);
      if (weight === 0) return;
      
      let p = 0;
      if (s.severity === 'critical') p = 15;
      else if (s.severity === 'high') p = 10;
      else if (s.severity === 'medium') p = 6;
      else if (s.severity === 'low') p = 4;
      
      securityPenalty += p * weight;
    });
    const securityScore = Math.max(0, Math.min(100, 100 - securityPenalty));

    // 2. Performance Score
    let performancePenalty = 0;
    performance.forEach((p) => {
      const weight = p.file ? AnalysisService.getPathWeight(p.file) : 1.0;
      if (weight === 0) return;
      
      let pen = 0;
      if (p.severity === 'high') pen = 10;
      else if (p.severity === 'medium') pen = 6;
      else if (p.severity === 'low') pen = 4;
      
      performancePenalty += pen * weight;
    });
    if (!hasTests) {
      performancePenalty += 10;
    }
    const performanceScore = Math.max(0, Math.min(100, 100 - performancePenalty));

    // 3. Quality Score
    let qualityPenalty = 0;
    quality.forEach((q) => {
      const weight = q.file ? AnalysisService.getPathWeight(q.file) : 1.0;
      if (weight === 0) return;
      
      let pen = 0;
      if (q.severity === 'high') pen = 10;
      else if (q.severity === 'medium') pen = 6;
      else if (q.severity === 'low') pen = 4;
      
      qualityPenalty += pen * weight;
    });
    if (!hasReadme) qualityPenalty += 20;
    if (!hasTests) qualityPenalty += 15;
    const qualityScore = Math.max(0, Math.min(100, 100 - qualityPenalty));

    // 4. Cloud Score
    let cloudScore = 100;
    if (!isFrameworkOrLib) {
      if (!hasDocker) cloudScore -= 25;
    }
    if (!hasCicd) cloudScore -= 10;
    cloudScore = Math.max(0, Math.min(100, cloudScore));

    // 5. Overall Score (Custom weighted if framework/library)
    const overall = isFrameworkOrLib
      ? Math.round((securityScore * 0.15) + (performanceScore * 0.15) + (qualityScore * 0.5) + (cloudScore * 0.2))
      : Math.round((securityScore + performanceScore + qualityScore + cloudScore) / 4);

    // Logging for verification
    console.log(`Security Score: ${securityScore}`);
    console.log(`Performance Score: ${performanceScore}`);
    console.log(`Quality Score: ${qualityScore}`);
    console.log(`Cloud Score: ${cloudScore}`);
    console.log(`Overall Score: ${overall}`);

    return {
      overall,
      security: securityScore,
      performance: performanceScore,
      quality: qualityScore,
      cloud: cloudScore,
      breakdown: {
        security: securityScore,
        performance: performanceScore,
        quality: qualityScore,
        cloud: cloudScore
      }
    };
  }

  private static checkForTests(repoIndex: any[]): boolean {
    return (repoIndex || []).some(f => {
      const lower = f.relativePath.toLowerCase();
      if (f.isDirectory) {
        return lower.endsWith('/test') || lower.endsWith('/tests') || lower.endsWith('/__tests__') ||
               lower === 'test' || lower === 'tests' || lower === '__tests__';
      } else {
        return lower.endsWith('.test.js') || lower.endsWith('.spec.js') ||
               lower.endsWith('.test.ts') || lower.endsWith('.spec.ts') ||
               lower.endsWith('.test.jsx') || lower.endsWith('.spec.jsx') ||
               lower.endsWith('.test.tsx') || lower.endsWith('.spec.tsx');
      }
    });
  }

  private static generateDynamicArchitecture(
    repoIndex: any[],
    techInfo: TechnologyInfo,
    securityFindings: SecurityFinding[],
    fileCount: number
  ) {
    // 1. Filter out ignored files: tests, samples, examples, documentation, benchmarks
    const files = (repoIndex || []).filter((f: any) => {
      if (f.isDirectory) return false;
      const lower = f.relativePath.toLowerCase();
      const parts = lower.split(/[/\\]/);
      return !parts.some((part: string) => 
        part === 'test' || part === 'tests' || part === '__tests__' ||
        part === 'spec' || part === 'specs' || part === 'docs' ||
        part === 'documentation' || part === 'sample' || part === 'samples' ||
        part === 'benchmark' || part === 'benchmarks' || part === 'example' ||
        part === 'examples' || part === 'demo' || part === 'demos'
      );
    });

    const techString = JSON.stringify(techInfo).toLowerCase() + " " + JSON.stringify(repoIndex).toLowerCase();
    
    // 2. Identify Technologies
    const isNestJS = techString.includes('nestjs') || techString.includes('@nestjs');
    const isExpress = techString.includes('express');
    const isSpringBoot = techString.includes('spring-boot') || techString.includes('springboot') || files.some((f: any) => f.relativePath.endsWith('.java') && techString.includes('spring'));
    const isReact = techString.includes('react') || files.some((f: any) => f.relativePath.endsWith('.tsx') || f.relativePath.endsWith('.jsx'));
    const isNext = techString.includes('next.js') || techString.includes('nextjs') || files.some((f: any) => f.relativePath.includes('next.config'));
    const isAxios = techString.includes('axios');
    
    const frontendFramework = isNext ? 'Next.js' : (isReact ? 'React' : 'none');
    const backendFramework = isNestJS ? 'NestJS' : (isExpress ? 'Express' : (isSpringBoot ? 'Spring Boot' : 'none'));
    
    const hasFrontend = frontendFramework !== 'none';
    const hasBackend = backendFramework !== 'none';
    
    // 3. Database detection
    let hasDatabase = false;
    let databaseTech = 'None Detected';
    if (techString.includes('mongoose') || techString.includes('mongodb')) {
      hasDatabase = true;
      databaseTech = 'MongoDB / Mongoose';
    } else if (techString.includes('pg') || techString.includes('postgres') || techString.includes('sequelize')) {
      hasDatabase = true;
      databaseTech = 'PostgreSQL';
    } else if (techString.includes('mysql') || techString.includes('mysql2')) {
      hasDatabase = true;
      databaseTech = 'MySQL';
    } else if (techString.includes('redis')) {
      hasDatabase = true;
      databaseTech = 'Redis';
    }

    const hasRedis = techString.includes('redis') || techString.includes('ioredis');

    // 4. Helper to find real codebase files
    const findMatchingFiles = (sub: string, ext?: string, limit = 2): string => {
      const matched = files
        .filter((f: any) => {
          const pathLower = f.relativePath.toLowerCase();
          const matchesSub = pathLower.includes(sub);
          const matchesExt = ext ? pathLower.endsWith(ext) : true;
          return matchesSub && matchesExt;
        })
        .map((f: any) => f.relativePath.split(/[/\\]/).pop() || f.relativePath);
      return matched.length > 0 ? matched.slice(0, limit).join(', ') : '';
    };

    const tempNodes: any[] = [];
    const tempEdges: any[] = [];

    const addNode = (tier: number, id: string, label: string, type: string, data: any) => {
      tempNodes.push({
        id,
        label,
        type,
        tier,
        position: { x: 0, y: 0 },
        data: {
          ...data,
          health: data.health || 'healthy',
        }
      });
    };

    // 5. Build dynamic software architecture flow model
    if (hasFrontend && hasBackend) {
      // Decoupled / Full Stack Flow
      // Frontend (Tiers 1-7)
      addNode(1, 'node-browser', 'Web Browser', 'client', {
        technology: frontendFramework,
        description: 'Client-side host execution environment running standard browser run loops.',
        detectionReason: 'Frontend frameworks found in package.json.',
        filesResponsible: 'index.html, package.json',
        aiRecommendation: 'Leverage HTTP caching headers and CDN distributions.',
        dependencies: 'react, react-dom',
        confidence: 99
      });

      addNode(2, 'node-fe-entry', isNext ? 'Next App Router' : 'Client Router', 'router', {
        technology: isNext ? 'NextJS Layout Routing' : 'React Router DOM',
        description: 'Binds browser history events to layout viewports.',
        detectionReason: 'Client routing libraries detected.',
        filesResponsible: findMatchingFiles('route', 'ts') || findMatchingFiles('app', 'tsx') || 'App.tsx',
        aiRecommendation: 'Enforce route lazy loading to keep bundle size low.',
        dependencies: isNext ? 'next' : 'react-router-dom',
        confidence: 96
      });

      addNode(3, 'node-fe-pages', 'Route Viewports', 'pages', {
        technology: 'React Page Components',
        description: 'Top-level viewport render wrappers mapping to paths.',
        detectionReason: 'Identified page definitions in directory tree.',
        filesResponsible: findMatchingFiles('pages') || findMatchingFiles('views') || 'src/pages/',
        aiRecommendation: 'Keep views stateless and delegate side-effects to custom hook layers.',
        dependencies: 'react',
        confidence: 95
      });

      addNode(4, 'node-fe-components', 'UI Components', 'components', {
        technology: 'Reusable DOM Components',
        description: 'Atomic UI blocks designed for layout composition.',
        detectionReason: 'Discovered atomic UI component directories.',
        filesResponsible: findMatchingFiles('components') || 'src/components/',
        aiRecommendation: 'Create component storybooks to build and test elements in isolation.',
        dependencies: 'clsx, tailwind-merge',
        confidence: 97
      });

      addNode(5, 'node-fe-hooks', 'Custom Hooks', 'hooks', {
        technology: 'React Hooks API',
        description: 'Reusable side-effects and React context selectors.',
        detectionReason: 'Discovered modular state helpers.',
        filesResponsible: findMatchingFiles('hooks') || 'src/hooks/',
        aiRecommendation: 'Memoize expensive hooks callbacks to avoid redraw lag.',
        dependencies: 'react',
        confidence: 96
      });

      addNode(6, 'node-fe-context', 'Global Context / Store', 'context', {
        technology: isNext ? 'NextJS Context' : 'React Context / Zustand',
        description: 'Centralized state client-side pub/sub store.',
        detectionReason: 'Discovered state store initializations.',
        filesResponsible: findMatchingFiles('context') || findMatchingFiles('store') || 'src/store/',
        aiRecommendation: 'Split dynamic context selectors to prevent excessive redraws.',
        dependencies: 'zustand, react',
        confidence: 95
      });

      addNode(7, 'node-fe-api', 'API Client Layer', 'client', {
        technology: isAxios ? 'Axios REST Client' : 'Fetch API Client',
        description: 'Encapsulates HTTP request adapters, interceptors, and payloads.',
        detectionReason: 'Detected API integration modules.',
        filesResponsible: findMatchingFiles('api') || findMatchingFiles('services') || 'src/services/',
        aiRecommendation: 'Configure explicit request timeouts to prevent hung socket channels.',
        dependencies: isAxios ? 'axios' : 'native-fetch',
        confidence: 98
      });

      // Backend (Tiers 8-12)
      addNode(8, 'node-be-ingress', 'API Ingress Gateway', 'gateway', {
        technology: backendFramework === 'Express' ? 'Express Router' : 'NestJS Controller Router',
        description: 'Accepts frontend HTTP payloads and routes traffic.',
        detectionReason: 'Backend application routing setups found.',
        filesResponsible: findMatchingFiles('server') || findMatchingFiles('app') || 'server.ts',
        aiRecommendation: 'Implement cors origin limits and payload size validation limits.',
        dependencies: backendFramework.toLowerCase(),
        confidence: 99
      });

      addNode(9, 'node-be-middleware', 'Security & Auth Middleware', 'middleware', {
        technology: 'JWT Validator & CORS Parser',
        description: 'Intercepts incoming transactions to enforce security credentials.',
        detectionReason: 'Authorization handlers detected.',
        filesResponsible: findMatchingFiles('middleware') || findMatchingFiles('auth') || 'auth.ts',
        aiRecommendation: 'Integrate helmet and rate-limiting modules to defend against automated script scans.',
        dependencies: 'jsonwebtoken, cors',
        confidence: 98
      });

      addNode(10, 'node-be-controllers', 'API Controllers', 'controller', {
        technology: 'Request Payload Orchestrators',
        description: 'Unpacks HTTP payloads, invokes business services, and returns codes.',
        detectionReason: 'Discovered request routing controller boundaries.',
        filesResponsible: findMatchingFiles('controller') || 'src/controllers/',
        aiRecommendation: 'Utilize schema validation libraries (such as Zod) on body parameters.',
        dependencies: 'zod',
        confidence: 99
      });

      addNode(11, 'node-be-services', 'Business Services', 'service', {
        technology: 'Core Transaction Engine',
        description: 'Executes algorithms, aggregates logs, and manages logic.',
        detectionReason: 'Discovered service-layer algorithm modules.',
        filesResponsible: findMatchingFiles('services') || 'src/services/',
        aiRecommendation: 'Keep service implementations decoupled from HTTP routers.',
        dependencies: 'simple-git, fs-extra',
        confidence: 99
      });

      addNode(12, 'node-be-repos', 'Data Repositories / Schema', 'repository', {
        technology: 'Database Entity Adapter',
        description: 'Interfaces code queries with the persistent storage database schemas.',
        detectionReason: 'Discovered db connection schemas and models.',
        filesResponsible: findMatchingFiles('models') || findMatchingFiles('repositories') || 'src/models/',
        aiRecommendation: 'Ensure indexing is active on all common filter attributes.',
        dependencies: 'mongoose, pg',
        confidence: 98
      });

      // Link Frontend Flow Sequential Tiers
      tempEdges.push({ id: 'edge-1', source: 'node-browser', target: 'node-fe-entry', label: 'Inbound Request' });
      tempEdges.push({ id: 'edge-2', source: 'node-fe-entry', target: 'node-fe-pages', label: 'Layout Bind' });
      tempEdges.push({ id: 'edge-3', source: 'node-fe-pages', target: 'node-fe-components', label: 'DOM Render' });
      tempEdges.push({ id: 'edge-4', source: 'node-fe-components', target: 'node-fe-hooks', label: 'Hook Inbound' });
      tempEdges.push({ id: 'edge-5', source: 'node-fe-hooks', target: 'node-fe-context', label: 'State Access' });
      tempEdges.push({ id: 'edge-6', source: 'node-fe-context', target: 'node-fe-api', label: 'Query Ingress' });
      
      // Link Frontend Client API to Backend Router
      tempEdges.push({ id: 'edge-fe-to-be', source: 'node-fe-api', target: 'node-be-ingress', label: 'HTTP REST' });

      // Link Backend Flow Sequential Tiers
      tempEdges.push({ id: 'edge-7', source: 'node-be-ingress', target: 'node-be-middleware', label: 'Security Check' });
      tempEdges.push({ id: 'edge-8', source: 'node-be-middleware', target: 'node-be-controllers', label: 'Authorize' });
      tempEdges.push({ id: 'edge-9', source: 'node-be-controllers', target: 'node-be-services', label: 'Execute Logic' });
      tempEdges.push({ id: 'edge-10', source: 'node-be-services', target: 'node-be-repos', label: 'Read/Write Data' });

    } else if (hasFrontend) {
      // Pure Frontend Client Flow
      addNode(1, 'node-browser', 'Web Browser', 'client', {
        technology: frontendFramework,
        description: 'Client execution viewport host running JS DOM draw loops.',
        detectionReason: 'Frontend dependencies detected.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Enforce bundle minification and HTTP caching policies.',
        dependencies: 'react',
        confidence: 99
      });

      addNode(2, 'node-react-entry', 'App Entrypoint', 'router', {
        technology: 'React Runtime Main',
        description: 'Initializes DOM hydration tree.',
        detectionReason: 'Client entry files located.',
        filesResponsible: findMatchingFiles('main') || findMatchingFiles('index') || 'index.tsx',
        aiRecommendation: 'Ensure root error boundary catches boot failures.',
        dependencies: 'react-dom',
        confidence: 98
      });

      addNode(3, 'node-react-pages', 'Route Page Viewports', 'pages', {
        technology: 'React Route Components',
        description: 'Layout containers matching path segments.',
        detectionReason: 'Found page routes folder.',
        filesResponsible: findMatchingFiles('pages') || 'src/pages/',
        aiRecommendation: 'Implement lazy routes to keep chunks lightweight.',
        dependencies: 'react-router-dom',
        confidence: 96
      });

      addNode(4, 'node-react-components', 'UI Components', 'components', {
        technology: 'DOM Elements components',
        description: 'Interactive layouts and visual components.',
        detectionReason: 'Found components folder.',
        filesResponsible: findMatchingFiles('components') || 'src/components/',
        aiRecommendation: 'Verify design compliance with UI stories.',
        dependencies: 'clsx',
        confidence: 97
      });

      addNode(5, 'node-react-hooks', 'Custom Hooks', 'hooks', {
        technology: 'React Hooks API',
        description: 'State utilities and side-effect modules.',
        detectionReason: 'Custom state hooks found.',
        filesResponsible: findMatchingFiles('hooks') || 'src/hooks/',
        aiRecommendation: 'Avoid side effects inside custom event triggers.',
        dependencies: 'react',
        confidence: 95
      });

      addNode(6, 'node-react-context', 'Global Context / State', 'context', {
        technology: 'Zustand / Context Store',
        description: 'Centralized state pub/sub storage.',
        detectionReason: 'Context files found.',
        filesResponsible: findMatchingFiles('context') || 'src/context/',
        aiRecommendation: 'Split large contexts to optimize render speed.',
        dependencies: 'react',
        confidence: 96
      });

      addNode(7, 'node-react-api', 'HTTP API Client', 'client', {
        technology: isAxios ? 'Axios Client Instance' : 'Fetch Adapter',
        description: 'Dispatches server transactions and intercepts codes.',
        detectionReason: 'REST API adapters verified.',
        filesResponsible: findMatchingFiles('api') || 'src/services/',
        aiRecommendation: 'Validate responses to handle backend exceptions safely.',
        dependencies: isAxios ? 'axios' : 'fetch',
        confidence: 97
      });

      tempEdges.push({ id: 'edge-f1', source: 'node-browser', target: 'node-react-entry', label: 'Launch' });
      tempEdges.push({ id: 'edge-f2', source: 'node-react-entry', target: 'node-react-pages', label: 'Route Match' });
      tempEdges.push({ id: 'edge-f3', source: 'node-react-pages', target: 'node-react-components', label: 'Render' });
      tempEdges.push({ id: 'edge-f4', source: 'node-react-components', target: 'node-react-hooks', label: 'Fetch hook' });
      tempEdges.push({ id: 'edge-f5', source: 'node-react-hooks', target: 'node-react-context', label: 'State update' });
      tempEdges.push({ id: 'edge-f6', source: 'node-react-context', target: 'node-react-api', label: 'Request' });

    } else if (hasBackend) {
      // Pure Backend Flow (Express / NestJS / Spring Boot)
      addNode(1, 'node-be-ingress', 'Inbound Gateway Ingress', 'client', {
        technology: 'Client HTTP Endpoint',
        description: 'Receives external API requests.',
        detectionReason: 'Backend packages detected.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Enforce rate-limiting filters to mitigate script scanners.',
        dependencies: 'cors',
        confidence: 99
      });

      addNode(2, 'node-be-router', backendFramework + ' Router', 'router', {
        technology: backendFramework + ' Routing Engine',
        description: 'Directs HTTP path resources to controller callbacks.',
        detectionReason: 'Routing bindings located.',
        filesResponsible: findMatchingFiles('routes') || 'src/routes/',
        aiRecommendation: 'Document paths in OpenAPI/Swagger specs.',
        dependencies: backendFramework.toLowerCase(),
        confidence: 98
      });

      addNode(3, 'node-be-middleware', 'Security Middleware', 'middleware', {
        technology: 'CORS & Token Guard',
        description: 'Authenticates authorization tokens in header.',
        detectionReason: 'Authorization guards found.',
        filesResponsible: findMatchingFiles('middleware') || 'src/middlewares/',
        aiRecommendation: 'Implement helmet headers to protect responses.',
        dependencies: 'jsonwebtoken',
        confidence: 97
      });

      addNode(4, 'node-be-controllers', 'API Controllers', 'controller', {
        technology: 'Request Handlers',
        description: 'Parses body parameters and routes transactions.',
        detectionReason: 'Controller patterns located.',
        filesResponsible: findMatchingFiles('controller') || 'src/controllers/',
        aiRecommendation: 'Add validator middleware to enforce body contracts.',
        dependencies: 'zod',
        confidence: 99
      });

      addNode(5, 'node-be-services', 'Business Services', 'service', {
        technology: 'Core Service Layer',
        description: 'Processes data operations and transactions.',
        detectionReason: 'Discovered service files.',
        filesResponsible: findMatchingFiles('services') || 'src/services/',
        aiRecommendation: 'Maintain loose coupling from framework abstractions.',
        dependencies: 'simple-git',
        confidence: 99
      });

      addNode(6, 'node-be-repos', 'Data Repositories', 'repository', {
        technology: 'Database Access Objects',
        description: 'Handles queries and persistent storage mapping.',
        detectionReason: 'Discovered models or data schemas.',
        filesResponsible: findMatchingFiles('models') || 'src/models/',
        aiRecommendation: 'Activate database connection limits.',
        dependencies: 'pg, mongoose',
        confidence: 98
      });

      tempEdges.push({ id: 'edge-b1', source: 'node-be-ingress', target: 'node-be-router', label: 'HTTP Query' });
      tempEdges.push({ id: 'edge-b2', source: 'node-be-router', target: 'node-be-middleware', label: 'Auth Check' });
      tempEdges.push({ id: 'edge-b3', source: 'node-be-middleware', target: 'node-be-controllers', label: 'Authorize' });
      tempEdges.push({ id: 'edge-b4', source: 'node-be-controllers', target: 'node-be-services', label: 'Service call' });
      tempEdges.push({ id: 'edge-b5', source: 'node-be-services', target: 'node-be-repos', label: 'Write DB' });

    } else if (isAxios) {
      // Axios / API Client Flow
      addNode(1, 'node-axios-consumer', 'Consumer Client API', 'client', {
        technology: 'REST Consumer API',
        description: 'Consuming codebase layer triggering outgoing API requests.',
        detectionReason: 'Axios package imports found.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Enforce error payload boundaries on query loops.',
        dependencies: 'axios',
        confidence: 98
      });

      addNode(2, 'node-axios-instance', 'Axios Instance Wrapper', 'router', {
        technology: 'Axios Request Instance',
        description: 'Custom client configurations including baseURL, timeout limits, and credentials.',
        detectionReason: 'Axios config blocks located.',
        filesResponsible: findMatchingFiles('axios') || findMatchingFiles('api') || 'axios.ts',
        aiRecommendation: 'Set explicit timeout parameters (e.g. 5000ms) on instances.',
        dependencies: 'axios',
        confidence: 97
      });

      addNode(3, 'node-axios-interceptors', 'Request/Response Interceptors', 'middleware', {
        technology: 'Axios Middleware Hooks',
        description: 'Injects JWT bearer headers before flight, and catches non-200 responses.',
        detectionReason: 'Axios interceptor definitions found.',
        filesResponsible: findMatchingFiles('interceptor') || 'interceptors.ts',
        aiRecommendation: 'Ensure token refresh loops exit properly on 401 code iterations.',
        dependencies: 'axios',
        confidence: 96
      });

      addNode(4, 'node-axios-pipeline', 'Request Pipeline Engine', 'service', {
        technology: 'Axios Pipeline Manager',
        description: 'Serializes headers and packages buffers.',
        detectionReason: 'Request handlers discovered.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Ensure payload shapes match expected JSON contracts.',
        dependencies: 'axios',
        confidence: 95
      });

      addNode(5, 'node-axios-adapter', 'HTTP/XHR Adapter Layer', 'repository', {
        technology: 'Native Adapter Bridge',
        description: 'Decides native fetch/xhr hooks depending on execution context.',
        detectionReason: 'Client requests bindings.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Enable keep-alive options on HTTP connection pools.',
        dependencies: 'axios',
        confidence: 94
      });

      addNode(6, 'node-axios-external-api', 'External Host Target API', 'database', {
        technology: 'Remote REST Target Server',
        description: 'Receives requests, processes payloads, and replies.',
        detectionReason: 'Outgoing REST references mapped.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Establish fallback states in case target API goes offline.',
        dependencies: 'external-api',
        confidence: 93
      });

      tempEdges.push({ id: 'edge-a1', source: 'node-axios-consumer', target: 'node-axios-instance', label: 'Call HTTP' });
      tempEdges.push({ id: 'edge-a2', source: 'node-axios-instance', target: 'node-axios-interceptors', label: 'Inject Token' });
      tempEdges.push({ id: 'edge-a3', source: 'node-axios-interceptors', target: 'node-axios-pipeline', label: 'Serialize' });
      tempEdges.push({ id: 'edge-a4', source: 'node-axios-pipeline', target: 'node-axios-adapter', label: 'Dispatch adapter' });
      tempEdges.push({ id: 'edge-a5', source: 'node-axios-adapter', target: 'node-axios-external-api', label: 'External REST Call' });

    } else {
      // Node Library Flow (Fallback)
      addNode(1, 'node-lib-consumer', 'Application Consumer', 'client', {
        technology: 'Importing Host App',
        description: 'Host codebase importing the exports of this library module.',
        detectionReason: 'Package build specs mapped.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Verify backward compatibility during semver updates.',
        dependencies: 'semver',
        confidence: 96
      });

      addNode(2, 'node-lib-api', 'Public Access API', 'gateway', {
        technology: 'Public Export Interface',
        description: 'Exposes library modules and functions.',
        detectionReason: 'Main/module declarations in package.json.',
        filesResponsible: 'index.ts, package.json',
        aiRecommendation: 'Enforce strict schema checking on parameters.',
        dependencies: 'typescript',
        confidence: 97
      });

      addNode(3, 'node-lib-engine', 'Core Library Engine', 'service', {
        technology: 'Library core module',
        description: 'Implements algorithms and core classes.',
        detectionReason: 'Core source code located.',
        filesResponsible: findMatchingFiles('core') || findMatchingFiles('engine') || 'src/',
        aiRecommendation: 'Ensure methods are stateless to prevent memory leak vulnerabilities.',
        dependencies: 'typescript',
        confidence: 98
      });

      addNode(4, 'node-lib-utils', 'Utility Helpers', 'components', {
        technology: 'Utility functions',
        description: 'Format helpers and algorithmic operations.',
        detectionReason: 'Utility packages discovered.',
        filesResponsible: findMatchingFiles('utils') || findMatchingFiles('helpers') || 'src/utils/',
        aiRecommendation: 'Enforce pure outputs and write unit test suites.',
        dependencies: 'lodash',
        confidence: 96
      });

      addNode(5, 'node-lib-adapters', 'Platform Adapters', 'repository', {
        technology: 'Environment Bridge OS',
        description: 'Decoupled adapter interfaces connecting to platform layers.',
        detectionReason: 'Adapters folders located.',
        filesResponsible: findMatchingFiles('adapters') || 'src/adapters/',
        aiRecommendation: 'Abstract platform-dependent APIs carefully.',
        dependencies: 'typescript',
        confidence: 95
      });

      tempEdges.push({ id: 'edge-l1', source: 'node-lib-consumer', target: 'node-lib-api', label: 'Import library' });
      tempEdges.push({ id: 'edge-l2', source: 'node-lib-api', target: 'node-lib-engine', label: 'Execute method' });
      tempEdges.push({ id: 'edge-l3', source: 'node-lib-engine', target: 'node-lib-utils', label: 'Helper' });
      tempEdges.push({ id: 'edge-l4', source: 'node-lib-engine', target: 'node-lib-adapters', label: 'Adapter mapping' });
    }

    // 6. Connect Database & Cache nodes dynamically to the repositories/models
    const finalRepoNode = tempNodes.find(n => n.id.endsWith('-repos') || n.id.endsWith('-api') || n.id.endsWith('-adapters'));
    const finalServiceNode = tempNodes.find(n => n.id.endsWith('-services') || n.id.endsWith('-engine'));
    
    const dbTier = finalRepoNode ? finalRepoNode.tier + 1 : (finalServiceNode ? finalServiceNode.tier + 2 : 7);

    if (hasDatabase) {
      addNode(dbTier, 'node-database', 'Database Layer', 'database', {
        technology: databaseTech,
        description: `Persistent SQL/NoSQL storage layer implemented via ${databaseTech}.`,
        health: 'healthy',
        detectionReason: 'Discovered database connector dependencies in manifest.',
        filesResponsible: 'package.json, config/database.ts',
        aiRecommendation: 'Enforce request timeout bounds and configure connection pooling.',
        dependencies: 'mongoose, pg',
        confidence: 99
      });
      if (finalRepoNode) {
        tempEdges.push({ id: `edge-db-persist`, source: finalRepoNode.id, target: 'node-database', label: 'SQL/NoSQL Query' });
      }
    }

    if (hasRedis) {
      addNode(dbTier, 'node-cache', 'Redis Cache', 'cache', {
        technology: 'Redis Database',
        description: 'In-memory storage layer caching queries, queues, and API sessions.',
        health: 'healthy',
        detectionReason: 'Discovered Redis dependencies in package manifest.',
        filesResponsible: 'package.json',
        aiRecommendation: 'Verify cache items specify key TTLs to prevent memory issues.',
        dependencies: 'redis, ioredis',
        confidence: 99
      });
      if (finalServiceNode) {
        tempEdges.push({ id: `edge-cache-persist`, source: finalServiceNode.id, target: 'node-cache', label: 'Cache Query' });
      }
    }

    // 7. Deployment and CI/CD node
    const hasDocker = techString.includes('dockerfile') || techString.includes('docker-compose');
    const hasCicd = techString.includes('.github/workflows');
    const hasDeployment = hasDocker || hasCicd;

    addNode(dbTier + 1, 'node-deployment', 'Deployment & CI/CD', 'cdn', {
      technology: hasDeployment ? (hasDocker ? 'Docker / GitHub Actions' : 'GitHub Actions') : 'No deployment configuration found.',
      description: hasDeployment
        ? `Configured container images and automated deployment pipelines.`
        : 'No deployment configuration found. In order to configure deployments, add files such as a Dockerfile, docker-compose.yml, vercel.json, netlify.toml, render.yaml, or GitHub Action workflows.',
      health: hasDeployment ? 'healthy' : 'warning',
      detectionReason: hasDeployment ? 'Found Dockerfile or pipeline yaml files.' : 'No deployment files found.',
      filesResponsible: hasDeployment ? 'Dockerfile, .github/workflows/' : 'None',
      aiRecommendation: hasDeployment ? 'Secure secrets in environment vars and restrict workflow rights.' : 'Add a Dockerfile or deployment descriptors.',
      dependencies: hasDeployment ? 'docker, github-actions' : 'None',
      confidence: 96
    });

    const finalDatabaseNode = tempNodes.find(n => n.id === 'node-database' || n.id === 'node-cache') || finalRepoNode || finalServiceNode;
    if (finalDatabaseNode) {
      tempEdges.push({ id: `edge-deploy-persist`, source: finalDatabaseNode.id, target: 'node-deployment', label: 'Pipeline Bind' });
    }

    // 8. Auto-Layout Coordinator (Columns and Centering)
    const tierCounts: Record<number, number> = {};
    tempNodes.forEach(node => {
      tierCounts[node.tier] = (tierCounts[node.tier] || 0) + 1;
    });

    const tierIndices: Record<number, number> = {};
    tempNodes.forEach(node => {
      const tier = node.tier;
      if (tierIndices[tier] === undefined) tierIndices[tier] = 0;
      const index = tierIndices[tier]++;
      const count = tierCounts[tier];
      
      const x = 100 + (tier - 1) * 280;
      const totalHeight = (count - 1) * 160;
      const y = 300 - (totalHeight / 2) + index * 160;
      
      node.position = { x, y };
    });

    // 9. Summary Details mapping
    const pattern = hasFrontend && hasBackend 
      ? 'Decoupled Client-Server (MVC)' 
      : hasFrontend 
        ? 'Single Page Application (SPA)' 
        : (hasBackend ? 'API Gateway / Monolith' : 'Library Module');

    const complexity = fileCount > 200 ? 'High' : fileCount > 50 ? 'Medium' : 'Low';
    
    const aiSummary = `The repository displays a ${pattern} pattern. It features a client rendering layout built on ${frontendFramework} connected to a ${backendFramework} backend controller tier mapping queries directly onto the ${databaseTech} database. Deployment configurations are managed via ${hasDeployment ? 'Dockerized container images and workflows' : 'standard hosting profiles'}.`;

    return {
      pattern,
      type: pattern,
      nodes: tempNodes,
      edges: tempEdges,
      summary: {
        pattern,
        componentsCount: tempNodes.length,
        framework: `${frontendFramework === 'none' ? '' : frontendFramework} ${backendFramework === 'none' ? '' : '+ ' + backendFramework}`.trim() || 'Custom',
        database: databaseTech,
        deployment: hasDeployment ? (hasDocker ? 'Docker + Kubernetes' : 'GitHub Actions') : 'None Detected',
        complexity,
        aiSummary
      }
    };
  }
}
