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

export interface SecurityFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  evidence: string;
  file: string;
  lineNumber: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface QualityFinding {
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
  file: string;
}

export interface PerformanceFinding {
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
  file: string;
  impact: string;
}

export interface DeploymentFinding {
  title: string;
  type: string;
  configPath: string;
}

export interface ArchitectureMetadata {
  pattern: 'MVC' | 'Monolith' | 'Layered' | 'Microservices' | 'Unknown';
  type: string;
  nodes: { id: string; label: string; type: string; position: { x: number; y: number }; data: { technology?: string; health?: string } }[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

export interface LaunchScoreBreakdown {
  overall: number;
  security: number;
  performance: number;
  quality: number;
  cloud: number;
}

export interface AnalysisResponse {
  metadata: RepositoryMetadata;
  technology: TechnologyInfo;
  security_findings: SecurityFinding[];
  quality_findings: QualityFinding[];
  performance_findings: PerformanceFinding[];
  deployment_findings: DeploymentFinding[];
  architecture: ArchitectureMetadata;
  launch_score: LaunchScoreBreakdown;
}
