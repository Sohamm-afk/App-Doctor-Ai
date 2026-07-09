export interface RepositoryEvidence {
  dependencies: Set<string>;
  devDependencies: Set<string>;
  files: Set<string>;
  folders: Set<string>;
  imports: Set<string>;
  configFiles: Set<string>;
  entryFiles: Set<string>;
}

export function collectEvidence(scan: any): RepositoryEvidence {
  const dependencies = new Set<string>();
  const devDependencies = new Set<string>();
  const files = new Set<string>();
  const folders = new Set<string>();
  const imports = new Set<string>();
  const configFiles = new Set<string>();
  const entryFiles = new Set<string>();

  if (!scan) {
    return { dependencies, devDependencies, files, folders, imports, configFiles, entryFiles };
  }

  // 1. Files & folders from repoIndex
  const repoIndex = scan.raw_stats?.repoIndex || scan.repoIndex || [];
  repoIndex.forEach((f: any) => {
    if (f.relativePath) {
      const cleanPath = f.relativePath.replace(/\\/g, '/');
      files.add(cleanPath);

      // Extract parent folders
      const parts = cleanPath.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        folders.add(parts[i]);
      }
    }
    if (f.isDirectory && f.relativePath) {
      const cleanPath = f.relativePath.replace(/\\/g, '/');
      folders.add(cleanPath);
    }
  });

  // 2. Scan metadata important files list
  const importantFiles = scan.metadata?.important_files || scan.importantFiles || [];
  importantFiles.forEach((f: string) => {
    const cleanPath = f.replace(/\\/g, '/');
    files.add(cleanPath);
    const parts = cleanPath.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      folders.add(parts[i]);
    }
  });

  // 3. Define common configuration and entry patterns
  const CONFIG_PATTERNS = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'tsconfig.json', 'pom.xml', 'build.gradle', 'composer.json', 'go.mod',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml',
    'next.config.js', 'next.config.mjs', 'vite.config.ts', 'vite.config.js',
    'schema.prisma', 'drizzle.config.ts', 'drizzle.config.js', 'ormconfig.json',
    '.sequelizerc', 'deployment.yaml', 'service.yaml', 'ingress.yaml'
  ];

  const ENTRY_PATTERNS = [
    'app.js', 'server.js', 'index.js', 'main.ts', 'main.js', 'app.ts',
    'nest-cli.json', 'next.config.js', 'next.config.mjs', 'next.config.ts'
  ];

  files.forEach(file => {
    const filename = file.split('/').pop() || '';
    const filenameLower = filename.toLowerCase();

    if (CONFIG_PATTERNS.some(pat => filenameLower === pat.toLowerCase())) {
      configFiles.add(file);
    }
    if (ENTRY_PATTERNS.some(pat => filenameLower === pat.toLowerCase())) {
      entryFiles.add(file);
    }
  });

  // 4. Structured fields returned from the backend
  const tech = scan.technology || {};
  
  if (tech.dependencies && Array.isArray(tech.dependencies)) {
    tech.dependencies.forEach((d: string) => dependencies.add(d.toLowerCase()));
  }
  if (tech.devDependencies && Array.isArray(tech.devDependencies)) {
    tech.devDependencies.forEach((d: string) => devDependencies.add(d.toLowerCase()));
  }
  if (tech.imports && Array.isArray(tech.imports)) {
    tech.imports.forEach((i: string) => imports.add(i.toLowerCase()));
  }

  // 5. Fallback heuristics from findings (parsing evidence lines)
  const findings = [
    ...(scan.security_findings || []),
    ...(scan.quality_findings || []),
    ...(scan.performance_findings || []),
    ...(scan.deployment_findings || [])
  ];

  findings.forEach((finding: any) => {
    const evidenceStr = (finding.evidence || '').toLowerCase();
    
    // JS/TS import patterns in finding evidence
    const jsRegexes = [
      /(?:import\s+.*\s+from\s+['"]|require\(['"])([^'"]+)['"]/g,
      /createclient\(\)/g,
      /jwt\.sign\(\)/g,
      /jwt\.verify\(\)/g,
    ];

    jsRegexes.forEach(regex => {
      let match;
      while ((match = regex.exec(evidenceStr)) !== null) {
        if (match[1]) {
          if (!match[1].startsWith('.')) {
            imports.add(match[1].toLowerCase());
          }
        } else {
          imports.add(match[0].toLowerCase());
        }
      }
    });

    // Mark imports if the finding title explicitly matches technology
    const title = (finding.title || '').toLowerCase();
    if (title.includes('redis') || title.includes('ioredis')) {
      imports.add('redis');
    }
    if (title.includes('postgres') || title.includes('postgresql')) {
      imports.add('pg');
    }
    if (title.includes('jwt') || title.includes('jsonwebtoken')) {
      imports.add('jsonwebtoken');
    }
  });

  return {
    dependencies,
    devDependencies,
    files,
    folders,
    imports,
    configFiles,
    entryFiles
  };
}
