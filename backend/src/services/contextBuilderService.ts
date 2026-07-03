import { AnalysisResponse } from '../types';

export interface SecuritySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  titles: string[];
}

export interface CompactSummary {
  count: number;
  titles: string[];
}

export interface DeploymentSummary {
  titles: string[];
}

export interface CompactContext {
  metadata: any;
  technology: any;
  architecture: any;
  launch_score: any;
  security_summary: SecuritySummary;
  quality_summary: CompactSummary;
  performance_summary: CompactSummary;
  deployment_summary: DeploymentSummary;
}

export class ContextBuilderService {
  /**
   * Compacts the full analysis/scan result into a lightweight, AI-friendly format.
   * Strips out raw stats, file paths, line numbers, evidence, and largestFiles to save tokens.
   */
  public static build(scanResult: any): CompactContext {
    if (!scanResult) {
      throw new Error('scanResult is required to build context');
    }

    const securityFindings = scanResult.security_findings || [];
    const qualityFindings = scanResult.quality_findings || [];
    const performanceFindings = scanResult.performance_findings || [];
    const deploymentFindings = scanResult.deployment_findings || [];

    const criticalCount = securityFindings.filter((f: any) => f.severity === 'critical').length;
    const highCount = securityFindings.filter((f: any) => f.severity === 'high').length;
    const mediumCount = securityFindings.filter((f: any) => f.severity === 'medium').length;
    const lowCount = securityFindings.filter((f: any) => f.severity === 'low' || f.severity === 'info').length;

    const securitySummary: SecuritySummary = {
      total: securityFindings.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      titles: securityFindings.map((f: any) => f.title),
    };

    const qualitySummary: CompactSummary = {
      count: qualityFindings.length,
      titles: qualityFindings.map((f: any) => f.title),
    };

    const performanceSummary: CompactSummary = {
      count: performanceFindings.length,
      titles: performanceFindings.map((f: any) => f.title),
    };

    const deploymentSummary: DeploymentSummary = {
      titles: deploymentFindings.map((f: any) => f.title),
    };

    return {
      metadata: scanResult.metadata || null,
      technology: scanResult.technology || null,
      architecture: scanResult.architecture || null,
      launch_score: scanResult.launch_score || null,
      security_summary: securitySummary,
      quality_summary: qualitySummary,
      performance_summary: performanceSummary,
      deployment_summary: deploymentSummary,
    };
  }
}
