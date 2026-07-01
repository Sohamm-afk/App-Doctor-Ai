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
    const { github_url } = req.body;
    let clonedRepoInfo: { localPath: string; repoName: string } | null = null;

    try {
      console.log(`[AnalyzeController] Starting analysis for repository: ${github_url}`);

      // 1. Validate URL & Clone Repository
      clonedRepoInfo = await GitService.cloneRepository(github_url);

      // 2. Scan Files
      const scanResult = await ScannerService.scanRepository(clonedRepoInfo.localPath);

      // 3. Detect technologies
      const techInfo = await DetectionService.detectTechnologies(clonedRepoInfo.localPath, scanResult);

      // 4. Generate Repository Metadata
      const metadata = MetadataService.generateMetadata(clonedRepoInfo.repoName, scanResult, techInfo);

      // 5. Run Static Code Heuristics Scanners
      const analysisResult = await AnalysisService.analyze(clonedRepoInfo.localPath, scanResult, techInfo);

      // 6. Cleanup Cloned Folder
      await deleteDirectory(clonedRepoInfo.localPath);
      clonedRepoInfo = null;

      // 7. Return Comprehensive Extended Metadata Findings
      res.status(200).json({
        metadata,
        technology: techInfo,
        raw_stats: scanResult,
        ...analysisResult
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

      const status = err.status || 500;
      const message = err.message || 'Unexpected Server Error';
      
      console.error(`[AnalyzeController] Analysis failed with status ${status}: ${message}`);
      res.status(status).json({
        status: 'error',
        message,
      });
    }
  }
}
