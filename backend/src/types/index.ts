export interface IndexedFile {
  relativePath: string;
  extension: string;
  size: number;
  isDirectory: boolean;
  isImportant: boolean;
}

export interface ScanResult {
  folderCount: number;
  fileCount: number;
  totalSize: number; // in bytes
  maxDepth: number;
  extensions: Record<string, number>;
  largestFiles: { path: string; size: number }[];
  importantFiles: string[];
  repoIndex: IndexedFile[];
  analysis_mode?: 'Fast Scan' | 'Full Scan';
  confidence?: number;
  message?: string;
}

export interface TechnologyInfo {
  languages: string[];
  frontend?: string;
  backend?: string;
  database?: string | null;
  packageManager?: string;
  deployment?: string;
  ciCd?: string;
  dependencies?: string[];
  devDependencies?: string[];
  imports?: string[];
}

export interface RepositoryMetadata {
  project_name: string;
  repository_name: string;
  project_type: 'Frontend' | 'Backend' | 'Full Stack' | 'Library' | 'CLI' | 'Monorepo' | 'Desktop' | 'Mobile' | 'Unknown';
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
  pattern: any;
  type: string;
  nodes: { id: string; label: string; type: string; position: { x: number; y: number }; data: { technology?: string; health?: string } }[];
  edges: { id: string; source: string; target: string; label?: string }[];
  summary?: any;
}

export interface LaunchScoreBreakdown {
  overall: number;
  security: number;
  performance: number;
  quality: number;
  cloud: number;
  breakdown?: {
    security: number;
    performance: number;
    quality: number;
    cloud: number;
  };
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
  overview_summary?: {
    repository_health: string;
    security_posture: string;
    performance: string;
    deployment_readiness: string;
    overall_recommendation: string;
    confidence: number;
  };
  cloud_cost_assessment?: {
    detected: boolean;
    monthly_estimate: string;
    annual_run_rate: string;
    ai_savings: string;
    why: string;
    recommendations: string;
    confidence: number;
  };
  scalability_assessment?: {
    score: 'Excellent' | 'Good' | 'Moderate' | 'Limited';
    explanation: string;
    recommendations: string[];
    confidence: number;
    metrics: {
      concurrentUsers: string;
      dbUtilization: string;
      queueDelay: string;
    };
  };
}
