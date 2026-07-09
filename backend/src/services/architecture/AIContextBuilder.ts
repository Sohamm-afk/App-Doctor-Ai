export interface SecurityFindingSummary {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file?: string;
  description?: string;
}

export interface PerformanceFindingSummary {
  title: string;
  file?: string;
  category?: string;
}

export interface CompactAIContext {
  repositoryProfile: {
    name: string;
    type: string;
    category: string;
    framework: string;
    pattern: string;
    runtime: string;
    primaryLanguage: string;
    hasTests: boolean;
    hasDocker: boolean;
    hasCI: boolean;
    totalFiles: number;
    totalFolders: number;
    database: string;
    packageManager: string;
  };
  architecture: {
    componentsCount: number;
    relationshipsCount: number;
    pattern: string;
    componentNames: string[];
  };
  security: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    topFindings: SecurityFindingSummary[];
  };
  performance: {
    score: number;
    bottlenecksDetected: number;
    topFindings: PerformanceFindingSummary[];
  };
  cloud: {
    deploymentType: string;
    hasDockerCompose: boolean;
    hasKubernetes: boolean;
    hasTerraform: boolean;
    hasGitHubActions: boolean;
    envConfigDetected: boolean;
  };
  scalability: {
    rating: string;
    verdict: string;
    hasConnectionPooling: boolean;
    hasCaching: boolean;
    hasMessageQueue: boolean;
    isStateless: boolean;
  };
  technicalDebt: {
    score: number;
    status: string;
    todoCount: number;
    fixmeCount: number;
    largeFileCount: number;
  };
  overallScore: number;
  topRisks: string[];
  topStrengths: string[];
  overallRecommendation: string;
  analysisConfidence: 'High' | 'Medium' | 'Low';
}

export class AIContextBuilder {
  private static contextCache = new Map<string, CompactAIContext>();

  /**
   * Clears the cache for a specific repo (useful when re-scanning).
   */
  public static invalidate(repoId: string): void {
    this.contextCache.delete(repoId);
  }

  /**
   * Builds and caches the compact AI context from full scan results.
   * Extracts only key engineering signals — prompt size reduced >85%.
   */
  public static buildAndCache(repoId: string, scanResult: any): CompactAIContext {
    if (!repoId) {
      repoId = scanResult?.repositoryProfile?.name || 'default-repo';
    }

    const cached = this.contextCache.get(repoId);
    if (cached) {
      return cached;
    }

    const profile = scanResult.repositoryProfile || {};
    const metadata = scanResult.metadata || {};
    const security = (scanResult.security_findings || []) as any[];
    const quality = (scanResult.quality_findings || []) as any[];
    const performance = (scanResult.performance_findings || []) as any[];

    // ── Severity counts ──────────────────────────────────────────────────────
    const criticalCount = security.filter((s) => s.severity === 'critical').length;
    const highCount = security.filter((s) => s.severity === 'high').length;
    const mediumCount = security.filter((s) => s.severity === 'medium').length;
    const lowCount = security.filter((s) => s.severity === 'low').length;

    // ── Scores ───────────────────────────────────────────────────────────────
    const launchScore = scanResult.launch_score || {};
    const securityScore  = launchScore.security  ?? Math.max(0, 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 5));
    const performanceScore = launchScore.performance ?? Math.max(0, 100 - performance.length * 10);
    const qualityScore   = launchScore.quality   ?? Math.max(0, 100 - quality.length * 5);
    const overallScore   = launchScore.overall   ?? Math.round((securityScore + performanceScore + qualityScore) / 3);

    // ── Helper: extract value from Fact objects or plain strings ─────────────
    const val = (item: any, fallback = 'Unknown'): string => {
      if (!item) return fallback;
      if (typeof item === 'string') return item || fallback;
      if (typeof item === 'object' && 'value' in item) return item.value || fallback;
      return fallback;
    };

    const frameworkVal  = val(profile.framework,          metadata.backend || metadata.frontend || 'None Detected');
    const patternVal    = val(profile.architecturePattern, 'Unknown');
    const runtimeVal    = val(profile.runtime,             'Unknown');
    const langVal       = val(profile.primaryLanguage,     (metadata.languages || []).join(', ') || 'Unknown');
    const typeVal       = val(profile.repositoryType,      'Unknown');
    const categoryVal   = val(profile.category,            'Software Package');
    const deployVal     = val(profile.deploymentType,      metadata.deployment || 'Not Detected');
    const databaseVal   = val(profile.database,            metadata.database || 'Not Detected');
    const pkgMgrVal     = val(profile.packageManager,      metadata.package_manager || 'Not Detected');

    // ── Top security findings (max 5, most severe first) ─────────────────────
    const topFindings: SecurityFindingSummary[] = security
      .sort((a, b) => {
        const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      })
      .slice(0, 5)
      .map((f) => ({
        title:       f.title || 'Unnamed Finding',
        severity:    f.severity || 'low',
        file:        f.file || undefined,
        description: f.description ? String(f.description).slice(0, 120) : undefined,
      }));

    // ── Top performance findings (max 4) ─────────────────────────────────────
    const topPerfFindings: PerformanceFindingSummary[] = performance
      .slice(0, 4)
      .map((f: any) => ({
        title:    f.title || 'Performance Issue',
        file:     f.file || undefined,
        category: f.category || undefined,
      }));

    // ── Architecture component names ─────────────────────────────────────────
    const componentNames: string[] = (scanResult.architecture?.nodes || [])
      .slice(0, 8)
      .map((n: any) => n.label || n.data?.label || 'Module');

    // ── Technical debt signals ────────────────────────────────────────────────
    const todoCount  = quality.filter((q: any) => /todo/i.test(q.title || '')).length;
    const fixmeCount = quality.filter((q: any) => /fixme/i.test(q.title || '')).length;
    const largeFileCount = quality.filter((q: any) => /large file/i.test(q.title || '')).length;

    // ── Infrastructure signals ────────────────────────────────────────────────
    const infraFlags = {
      hasDockerCompose:  !!(profile.hasDockerCompose || metadata.docker_compose),
      hasKubernetes:     !!(profile.hasKubernetes    || metadata.kubernetes),
      hasTerraform:      !!(profile.hasTerraform     || metadata.terraform),
      hasGitHubActions:  !!(profile.hasGitHubActions || metadata.github_actions || metadata.ci_cd?.toLowerCase().includes('github')),
      envConfigDetected: !!(profile.hasEnvFile       || metadata.env_file),
    };

    // ── Scalability signals ───────────────────────────────────────────────────
    const scalabilityData = scanResult.scalability || {};
    const hasConnectionPooling = !!(scalabilityData.connectionPooling || profile.hasConnectionPooling);
    const hasCaching           = !!(scalabilityData.caching           || profile.hasCaching);
    const hasMessageQueue      = !!(scalabilityData.messageQueue      || profile.hasMessageQueue);
    const isStateless          = !!(scalabilityData.stateless         || profile.isStateless);

    // ── Strengths ─────────────────────────────────────────────────────────────
    const strengths: string[] = [];
    if (profile.hasTests)                 strengths.push('Automated test suites detected.');
    if (profile.hasDocker)                strengths.push('Docker configuration verified — containerized deployment ready.');
    if (profile.hasCI)                    strengths.push('CI pipeline configuration detected.');
    if (hasCaching)                       strengths.push('Caching layer detected — reduces upstream load.');
    if (isStateless)                      strengths.push('Stateless architecture — scales horizontally without session coupling.');
    if (infraFlags.hasTerraform)          strengths.push('Infrastructure-as-Code detected (Terraform).');
    if (criticalCount === 0 && highCount === 0) strengths.push('No critical or high-severity security vulnerabilities found.');
    if (strengths.length < 2)             strengths.push('Structured codebase with recognizable architectural layers.');

    // ── Risks ─────────────────────────────────────────────────────────────────
    const risks: string[] = [];
    if (criticalCount > 0)  risks.push(`${criticalCount} critical-severity security ${criticalCount === 1 ? 'vulnerability' : 'vulnerabilities'} found.`);
    if (highCount > 0)      risks.push(`${highCount} high-severity security ${highCount === 1 ? 'issue' : 'issues'} detected.`);
    if (!profile.hasTests)  risks.push('No automated tests detected — production regressions are unguarded.');
    if (!profile.hasDocker) risks.push('No Docker configuration — deployment portability is limited.');
    if (!infraFlags.envConfigDetected) risks.push('.env configuration not detected — secret management is unclear.');
    if (todoCount + fixmeCount > 5)    risks.push(`${todoCount + fixmeCount} TODO/FIXME comments signal unfinished implementation work.`);
    if (risks.length === 0)             risks.push('No critical risks identified in the current scan.');

    // ── Confidence rating ─────────────────────────────────────────────────────
    const fileCount = metadata.file_count ?? scanResult.fileCount ?? 0;
    const confidence: CompactAIContext['analysisConfidence'] =
      fileCount > 50 ? 'High' : fileCount > 10 ? 'Medium' : 'Low';

    const compactContext: CompactAIContext = {
      repositoryProfile: {
        name:           repoId,
        type:           typeVal,
        category:       categoryVal,
        framework:      frameworkVal,
        pattern:        patternVal,
        runtime:        runtimeVal,
        primaryLanguage: langVal,
        hasTests:        !!profile.hasTests,
        hasDocker:       !!profile.hasDocker,
        hasCI:           !!profile.hasCI,
        totalFiles:      fileCount,
        totalFolders:    metadata.folder_count ?? scanResult.folderCount ?? 0,
        database:        databaseVal,
        packageManager:  pkgMgrVal,
      },
      architecture: {
        componentsCount:   scanResult.architecture?.nodes?.length || 0,
        relationshipsCount: scanResult.architecture?.edges?.length || 0,
        pattern:           patternVal,
        componentNames,
      },
      security: {
        score:          securityScore,
        criticalIssues: criticalCount,
        highIssues:     highCount,
        mediumIssues:   mediumCount,
        lowIssues:      lowCount,
        topFindings,
      },
      performance: {
        score:              performanceScore,
        bottlenecksDetected: performance.length,
        topFindings:        topPerfFindings,
      },
      cloud: {
        deploymentType:   deployVal,
        ...infraFlags,
      },
      scalability: {
        rating:              overallScore >= 80 ? 'Good' : 'Moderate',
        verdict:             overallScore >= 80
          ? 'Architecture can handle moderate scale without immediate restructuring.'
          : 'Bottlenecks present — remediation required before scaling.',
        hasConnectionPooling,
        hasCaching,
        hasMessageQueue,
        isStateless,
      },
      technicalDebt: {
        score:         qualityScore,
        status:        qualityScore >= 80 ? 'Healthy' : qualityScore >= 60 ? 'Moderate Debt' : 'High Debt — Refactoring Required',
        todoCount,
        fixmeCount,
        largeFileCount,
      },
      overallScore,
      topRisks:              risks,
      topStrengths:          strengths,
      overallRecommendation: scanResult?.overview_summary?.overall_recommendation
        || 'Address critical and high security findings before staging deployment.',
      analysisConfidence: confidence,
    };

    this.contextCache.set(repoId, compactContext);
    return compactContext;
  }
}
