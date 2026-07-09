import fs from 'fs';
import path from 'path';
import { ScanResult, TechnologyInfo, AnalysisResponse } from '../types';
import { ArchitectureAIService } from './ArchitectureAIService';

export interface ArchitectureNode {
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    layerName: string;
    technology?: string;
    health?: 'healthy' | 'warning' | 'error';
    confidence?: string;
    description?: string;
    details?: string[];
  };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  layer: string;
  description: string;
  detectedTechnology: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  color?: string;
  components?: ArchitectureComponent[];
}

export interface ArchitectureSummary {
  pattern: string;
  type: string;
  componentsCount: number;
  framework: string;
  database: string;
  authentication: string;
  deployment: string;
  complexity: 'Low' | 'Medium' | 'High';
  aiSummary: string;
}

export interface ArchitectureRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface ArchitectureRelationship {
  sourceComponentId: string;
  targetComponentId: string;
  relationshipType: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface ArchitectureModel {
  metadata: {
    repoPath: string;
    repoName: string;
  };
  pattern: string;
  type: string;
  layers: ArchitectureLayer[];
  relationships: ArchitectureRelationship[];
  summary: ArchitectureSummary;
  recommendations: ArchitectureRecommendation[];
}

export interface ArchitectureGraph {
  pattern: string;
  type: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  layers: ArchitectureLayer[];
  summary: ArchitectureSummary;
  recommendations: ArchitectureRecommendation[];
  relationships: ArchitectureRelationship[];
}

export class ArchitectureService {
  /**
   * Generates the architecture details for a scanned repository.
   * Compiles the Repository Intelligence and queries Gemini to return the software architecture graph.
   */
  public static async generateArchitecture(
    repoPath: string,
    scanResult: ScanResult,
    technologyInfo: TechnologyInfo,
    analysisResult: any
  ): Promise<any> {
    // Read package.json if it exists
    let packageJson: any = null;
    try {
      const pkgPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      }
    } catch (e) {
      // Ignore parsing errors
    }

    const dependencies = new Set<string>();
    let repoName = '';

    if (packageJson) {
      repoName = packageJson.name || '';
      if (packageJson.dependencies) {
        Object.keys(packageJson.dependencies).forEach(d => dependencies.add(d));
      }
      if (packageJson.devDependencies) {
        Object.keys(packageJson.devDependencies).forEach(d => dependencies.add(d));
      }
      if (packageJson.peerDependencies) {
        Object.keys(packageJson.peerDependencies).forEach(d => dependencies.add(d));
      }
    }

    // Fallback repoName from repoPath
    if (!repoName) {
      repoName = path.basename(repoPath) || '';
    }

    // Merge package.json deps into technologyInfo so the pipeline has the full picture
    const enrichedTechInfo: TechnologyInfo = {
      ...technologyInfo,
      dependencies: technologyInfo.dependencies?.length
        ? technologyInfo.dependencies
        : [...dependencies],
    };

    return ArchitectureAIService.generateArchitectureGraph(repoName, scanResult, enrichedTechInfo);
  }
}
