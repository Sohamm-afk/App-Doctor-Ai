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

    const meta = scanResult.metadata || {};
    const repoNameLower = (meta.repository_name || '').toLowerCase();
    const projectType = meta.project_type || 'Library';

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

    let scoreExplanation = '';
    if (isFrameworkRepo) {
      scoreExplanation = `This repository is classified as a Framework / Library Repository. The Launch Score is calculated differently from standard application deployments:
- Code Quality, Architecture & Maintainability: 50% weight in overall score.
- CI/CD & Automation: 20% weight.
- Performance & Core Security: 15% weight each.
- Docker containerization / production deployment is bypassed and carries 0 penalty.
- Missing Helmet headers, CORS, or Rate Limiting are NOT penalized since this is a library/framework codebase.
- Review focus: "This repository provides capabilities rather than representing a deployed production application." Focus recommendations on maintainability, extensibility, documentation, testing, API design, and framework architecture instead of deployment advice. Do not focus on application-level server setup or cloud VM scaling.`;
    } else if (isFrameworkOrLib) {
      scoreExplanation = `This repository is classified as a General Library or Utility Module. The Launch Score priorities emphasize API design, testing, and CI/CD automation rather than web service deployments.`;
    } else {
      scoreExplanation = `This repository is classified as a Production Application. The Launch Score is calculated as an average of Security, Performance, Quality, and Cloud Deployment readiness (25% weight each).`;
    }

    scoreExplanation += `\nWeighted path prioritization is applied to findings:
- Production code folders (src, app, lib, packages, server, backend, api): 1.0 weight (full penalty).
- Configurations and scripts: 0.6 weight.
- Tests (test, spec, integration): 0.3 weight. Security findings are classified as "Test Suite Code" (severity info, zero score penalty).
- Examples, samples, and demos: 0.1 weight. Security findings are classified as "Educational Code" (severity info, zero score penalty).
- Documentation (docs): 0.0 weight (fully ignored, zero penalty).`;

    return {
      metadata: scanResult.metadata || null,
      technology: scanResult.technology || null,
      architecture: scanResult.architecture || null,
      launch_score: scanResult.launch_score || null,
      security_summary: securitySummary,
      quality_summary: qualitySummary,
      performance_summary: performanceSummary,
      deployment_summary: deploymentSummary,
      score_explanation: scoreExplanation
    } as any;
  }
}
