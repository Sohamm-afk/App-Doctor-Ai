import { ScanResult, TechnologyInfo, RepositoryMetadata } from '../types';

export class MetadataService {
  /**
   * Compiles final scan findings and detections into a unified RepositoryMetadata model.
   */
  public static generateMetadata(
    repoName: string,
    scanResult: ScanResult,
    techInfo: TechnologyInfo
  ): RepositoryMetadata {
    // 1. Format human-readable Project Name from Repository Name (e.g. app-doctor -> App Doctor)
    const projectName = repoName
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // 2. Classify repository size: Small (<5MB), Medium (5-50MB), Large (>50MB)
    const sizeInMB = scanResult.totalSize / (1024 * 1024);
    let repositorySize: 'Small' | 'Medium' | 'Large' = 'Small';
    if (sizeInMB > 50) {
      repositorySize = 'Large';
    } else if (sizeInMB > 5) {
      repositorySize = 'Medium';
    }

    // 3. Classify Project Type based on detected stacks and files
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

    let projectType: RepositoryMetadata['project_type'] = 'Library';
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

    // 4. Inspect Docker configurations and README presence
    const dockerSupported = scanResult.importantFiles.some(
      (f) => f.endsWith('Dockerfile') || f.endsWith('docker-compose.yml') || f.endsWith('docker-compose.yaml')
    );
    const readmePresent = scanResult.importantFiles.some((f) => f.toLowerCase().endsWith('readme.md'));

    return {
      project_name: projectName,
      repository_name: repoName,
      project_type: projectType,
      languages: techInfo.languages,
      frontend: techInfo.frontend || null,
      backend: techInfo.backend || null,
      database: techInfo.database || null,
      package_manager: techInfo.packageManager || null,
      deployment: techInfo.deployment || null,
      ci_cd: techInfo.ciCd || null,
      repository_size: repositorySize,
      folder_count: scanResult.folderCount,
      file_count: scanResult.fileCount,
      docker_supported: dockerSupported,
      readme: readmePresent,
      important_files: scanResult.importantFiles,
    };
  }
}
