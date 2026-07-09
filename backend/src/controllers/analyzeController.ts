import { Request, Response, NextFunction } from 'express';
import { GitService } from '../services/gitService';
import { ScannerService } from '../services/scannerService';
import { DetectionService } from '../services/detectionService';
import { MetadataService } from '../services/metadataService';
import { AnalysisService } from '../services/analysisService';
import { deleteDirectory } from '../utils/fileSystem';

export class AnalyzeController {
  /**
   * Post analysis request handler. Clones, scans, detects technologies, compiles metadata,
   * cleans temp folders, and returns structured metadata or clean error codes.
   */
  public static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { github_url, fastScan } = req.body;
    let clonedRepoInfo: { localPath: string; repoName: string } | null = null;

    try {
      console.log(`[AnalyzeController] Starting analysis for repository: ${github_url}`);

      // 1. Validate URL & Clone Repository
      clonedRepoInfo = await GitService.cloneRepository(github_url);

      // 2. Scan Files
      const scanResult = await ScannerService.scanRepository(
        clonedRepoInfo.localPath,
        fastScan === true || fastScan === 'true'
      );

      // 3. Detect technologies
      const techInfo = await DetectionService.detectTechnologies(clonedRepoInfo.localPath, scanResult);

      // 4. Generate Repository Metadata
      const metadata = MetadataService.generateMetadata(clonedRepoInfo.repoName, scanResult, techInfo);

      // 5. Run Static Code Heuristics Scanners
      const analysisResult = await AnalysisService.analyze(clonedRepoInfo.localPath, scanResult, techInfo);

      // 6. Generate Unified Repository Profile
      const repositoryProfile = AnalyzeController.buildRepositoryProfile(clonedRepoInfo.repoName, scanResult, techInfo);

      // 7. Cleanup Cloned Folder
      await deleteDirectory(clonedRepoInfo.localPath);
      clonedRepoInfo = null;

      // 8. Return Comprehensive Extended Metadata Findings
      res.status(200).json({
        metadata,
        technology: techInfo,
        raw_stats: scanResult,
        repositoryProfile,
        ...analysisResult,
        analysis_mode: scanResult.analysis_mode || 'Full Scan',
        confidence: scanResult.confidence ?? 100,
        message: scanResult.message || 'Complete audit report generated successfully.'
      });
    } catch (err: any) {
      // Assure disk cleanups execute even upon failures
      if (clonedRepoInfo && clonedRepoInfo.localPath) {
        try {
          await deleteDirectory(clonedRepoInfo.localPath);
        } catch (cleanupErr) {
          console.error('[AnalyzeController] Failed cleanup of cloned directory:', cleanupErr);
        }
      }
      next(err);
    }
  }

  private static buildRepositoryProfile(repoName: string, scanResult: any, techInfo: any): any {
    const { Stage1_ContextBuilder } = require('../services/architecture/Stage1_ContextBuilder');
    const { Stage2_StaticAnalyzer } = require('../services/architecture/Stage2_StaticAnalyzer');
    const { EvidenceEngine } = require('../services/architecture/EvidenceEngine');

    const ctx = Stage1_ContextBuilder.build(repoName, scanResult, techInfo);
    const staticModel = Stage2_StaticAnalyzer.analyze(ctx);

    const type = staticModel.repositoryType;
    const pattern = staticModel.architecturePattern;
    const primaryLanguage = ctx.languages[0] || 'Unknown';
    const framework = staticModel.framework;
    const category = staticModel.category;
    const runtime = staticModel.runtime;

    // Deployment Type
    const importantFiles = scanResult.importantFiles || [];
    let deploymentType = 'Static Hosting';
    const hasDocker = importantFiles.some((f: string) => f.toLowerCase().includes('dockerfile') || f.toLowerCase().includes('docker-compose'));
    if (hasDocker) {
      deploymentType = 'Docker / Container';
    } else if (importantFiles.some((f: string) => f.toLowerCase().includes('vercel') || f.toLowerCase().includes('netlify'))) {
      deploymentType = 'Serverless / Cloud';
    } else if (framework === 'Express' || framework === 'NestJS' || framework === 'Spring Boot' || framework === 'FastAPI' || framework === 'Django' || framework === 'Laravel') {
      deploymentType = 'Virtual Machine / Host';
    }

    // Maturity
    const score = scanResult.launch_score?.overall ?? 85;
    let maturity = 'Stable';
    if (score < 60) {
      maturity = 'Needs Review';
    } else if (score >= 90) {
      maturity = 'Production Ready';
    }

    // Counts
    const fileCount = scanResult.fileCount || 0;
    const folderCount = scanResult.folderCount || 0;
    const dependencyCount = (techInfo.dependencies?.length || 0) + (techInfo.devDependencies?.length || 0);

    // Boolean features
    const hasTests = (scanResult.importantFiles || []).some((f: string) => f.toLowerCase().includes('test') || f.toLowerCase().includes('spec')) ||
                     (scanResult.repoIndex || []).some((f: any) => f.relativePath.toLowerCase().includes('/test/') || f.relativePath.toLowerCase().includes('/tests/') || f.relativePath.toLowerCase().includes('.test.') || f.relativePath.toLowerCase().includes('.spec.'));
    const hasCI = (scanResult.importantFiles || []).some((f: string) => f.toLowerCase().includes('.github/workflows') || f.toLowerCase().includes('.gitlab-ci.yml') || f.toLowerCase().includes('travis.yml') || f.toLowerCase().includes('circle.yml'));
    
    const hasDatabase = staticModel.components.some((c: any) => c.type === 'database');
    const hasCache = staticModel.components.some((c: any) => c.type === 'cache');
    const hasQueue = staticModel.components.some((c: any) => c.id.includes('queue') || c.id.includes('kafka') || c.id.includes('rabbitmq'));

    const detectedTechnologies = Array.from(new Set(
      staticModel.components.map((c: any) => c.technology)
        .concat(techInfo.languages || [])
        .filter((t: any) => t && t !== 'Unknown' && t !== 'TypeScript/JavaScript' && t !== 'JavaScript' && t !== 'TypeScript')
    ));

    // Language statistics calculation
    const rawExtensions = scanResult.extensions || {};
    const extMapping: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.mjs': 'JavaScript',
      '.cjs': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.java': 'Java',
      '.rs': 'Rust',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.h': 'C++',
      '.cc': 'C++',
      '.c': 'C',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.dart': 'Dart',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'CSS'
    };

    const langCounts: Record<string, number> = {};
    let totalSourceFiles = 0;

    Object.entries(rawExtensions).forEach(([ext, count]) => {
      const normalizedExt = ext.toLowerCase().trim();
      const lang = extMapping[normalizedExt];
      if (lang) {
        langCounts[lang] = (langCounts[lang] || 0) + (count as number);
        totalSourceFiles += (count as number);
      }
    });

    // Fallback if no files matched or scanned
    if (totalSourceFiles === 0) {
      if (primaryLanguage && primaryLanguage !== 'Unknown') {
        langCounts[primaryLanguage] = 1;
        totalSourceFiles = 1;
      } else {
        langCounts['JavaScript'] = 1;
        totalSourceFiles = 1;
      }
    }

    const sortedLangs = Object.entries(langCounts)
      .map(([lang, count]) => ({
        lang,
        count,
        percentage: Math.round((count / totalSourceFiles) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const calculatedPrimaryLanguage = sortedLangs[0]?.lang || 'JavaScript';
    const secondaryLanguages = sortedLangs.slice(1).map(item => item.lang);
    const languageDistribution: Record<string, number> = {};
    sortedLangs.forEach(item => {
      languageDistribution[item.lang] = item.percentage;
    });

    const typeFact = EvidenceEngine.explainRepositoryType(type, staticModel.confidence, ctx);
    const frameworkFact = EvidenceEngine.explainFramework(framework, staticModel.confidence, ctx);
    const patternFact = EvidenceEngine.explainArchitecturePattern(pattern, staticModel.confidence, ctx);

    const runtimeFact = EvidenceEngine.createFact(
      runtime,
      staticModel.confidence,
      ctx.configFiles.filter((f: string) => f.includes('package.json') || f.includes('requirements.txt') || f.includes('Cargo.toml') || f.includes('go.mod')),
      `Determined runtime interpreter using source files extensions distribution.`
    );
    const categoryFact = EvidenceEngine.createFact(
      category,
      staticModel.confidence,
      ctx.allFolders.filter((f: string) => ['src', 'lib', 'app', 'packages'].includes(f)),
      `Repository category classified from structural directory matching.`
    );
    const primaryLanguageFact = EvidenceEngine.createFact(
      calculatedPrimaryLanguage,
      95,
      ctx.sourceFiles.filter((f: string) => f.endsWith(calculatedPrimaryLanguage === 'TypeScript' ? '.ts' : calculatedPrimaryLanguage === 'Python' ? '.py' : '.js')).slice(0, 3),
      `Primary language counted by total extension share in analyzed files.`
    );
    const deploymentFact = EvidenceEngine.createFact(
      deploymentType,
      90,
      importantFiles.filter((f: string) => f.toLowerCase().includes('docker') || f.toLowerCase().includes('vercel') || f.toLowerCase().includes('netlify')),
      `Deployment options resolved from infrastructure build configs.`
    );
    const maturityFact = EvidenceEngine.createFact(
      maturity,
      85,
      importantFiles.filter((f: string) => f.toLowerCase().includes('test') || f.toLowerCase().includes('spec')),
      `Release stability score based on automated test suites and validation markers.`
    );

    return {
      name: repoName,
      repositoryType: typeFact,
      category: categoryFact,
      framework: frameworkFact,
      architecturePattern: patternFact,
      runtime: runtimeFact,
      primaryLanguage: primaryLanguageFact,
      secondaryLanguages,
      languageDistribution,
      confidence: staticModel.confidence,
      maturity: maturityFact,
      deploymentType: deploymentFact,
      packageManager: techInfo.packageManager || 'Unknown',
      fileCount,
      folderCount,
      dependencyCount,
      hasTests,
      hasDocker,
      hasCI,
      hasDatabase,
      hasCache,
      hasQueue,
      detectedTechnologies
    };
  }
}
