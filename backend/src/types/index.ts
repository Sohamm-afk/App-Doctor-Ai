export interface ScanResult {
  folderCount: number;
  fileCount: number;
  totalSize: number; // in bytes
  maxDepth: number;
  extensions: Record<string, number>;
  largestFiles: { path: string; size: number }[];
  importantFiles: string[];
}

export interface TechnologyInfo {
  languages: string[];
  frontend?: string;
  backend?: string;
  database?: string;
  packageManager?: string;
  deployment?: string;
  ciCd?: string;
}

export interface RepositoryMetadata {
  project_name: string;
  repository_name: string;
  project_type: 'Frontend' | 'Backend' | 'Full Stack' | 'Library' | 'CLI' | 'Unknown';
  languages: string[];
  frontend: string | null;
  backend: string | null;
  database: string | null;
  package_manager: string | null;
  deployment: string | null;
  ci_cd: string | null;
  repository_size: 'Small' | 'Medium' | 'Large';
  folder_count: number;
  file_count: number;
  docker_supported: boolean;
  readme: boolean;
  important_files: string[];
}
