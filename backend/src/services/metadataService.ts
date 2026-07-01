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

    // 3. Classify Project Type based on detected stacks
    let projectType: RepositoryMetadata['project_type'] = 'Unknown';
    if (techInfo.frontend && techInfo.backend) {
      projectType = 'Full Stack';
    } else if (techInfo.frontend) {
      projectType = 'Frontend';
    } else if (techInfo.backend) {
      projectType = 'Backend';
    } else if (scanResult.importantFiles.some((f) => f.toLowerCase().includes('cli') || f.includes('bin/'))) {
      projectType = 'CLI';
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
