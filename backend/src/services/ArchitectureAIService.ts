/**
 * ArchitectureAIService – thin facade over the new 4-stage pipeline.
 *
 * Keeping this file preserves the public API that ArchitectureService.ts
 * and aiController.ts already import.
 */

import { ScanResult, TechnologyInfo } from '../types';
import { ArchitecturePipeline, ArchitectureGraph } from './architecture/ArchitecturePipeline';

export { ArchitectureGraph };

// Legacy interface kept for backward compatibility
export interface RepositoryIntelligence {
  repositoryName: string;
  packageManager: string;
  languages: string[];
  detectedFrameworks: string[];
  repositoryTypeHints: string[];
  packageJson: {
    name?: string;
    dependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
  };
  topLevelFolders: string[];
  allFolders: string[];
  sourceFiles: string[];
  configFiles: string[];
  entryPoints: string[];
  testFiles: string[];
  deploymentFiles: string[];
  detectedImports: string[];
  internalModuleNames: string[];
  stats: {
    totalFiles: number;
    totalFolders: number;
    maxDepth: number;
    fileExtensions: Record<string, number>;
  };
}

export class ArchitectureAIService {
  /**
   * Public entry point used by the controller.
   * Delegates to the full 4-stage deterministic + AI pipeline.
   */
  static async generateArchitectureGraph(
    repoName: string,
    scanResult: ScanResult,
    technologyInfo: TechnologyInfo
  ): Promise<ArchitectureGraph> {
    return ArchitecturePipeline.run(repoName, scanResult, technologyInfo);
  }

  /**
   * Legacy shim – compileIntelligence used to be called by the controller.
   * Kept so older callers don't break; they should migrate to generateArchitectureGraph.
   */
  static compileIntelligence(
    metadata: { repoPath: string; repoName?: string },
    technologyInfo: TechnologyInfo,
    scanResult: ScanResult,
    _analysisResult: any
  ): RepositoryIntelligence {
    const name = metadata.repoName || metadata.repoPath || 'repository';
    const deps    = Array.isArray(technologyInfo.dependencies)    ? technologyInfo.dependencies    : [];
    const devDeps = Array.isArray(technologyInfo.devDependencies) ? technologyInfo.devDependencies : [];
    const imports = Array.isArray(technologyInfo.imports)         ? technologyInfo.imports         : [];

    return {
      repositoryName:   name,
      packageManager:   technologyInfo.packageManager || 'unknown',
      languages:        technologyInfo.languages || [],
      detectedFrameworks: [technologyInfo.frontend, technologyInfo.backend].filter(Boolean) as string[],
      repositoryTypeHints: [],
      packageJson:      { name, dependencies: deps, devDependencies: devDeps, peerDependencies: [] },
      topLevelFolders:  [],
      allFolders:       [],
      sourceFiles:      [],
      configFiles:      [],
      entryPoints:      [],
      testFiles:        [],
      deploymentFiles:  [],
      detectedImports:  imports,
      internalModuleNames: [],
      stats: {
        totalFiles:    scanResult.fileCount  || 0,
        totalFolders:  scanResult.folderCount || 0,
        maxDepth:      scanResult.maxDepth    || 0,
        fileExtensions: scanResult.extensions || {}
      }
    };
  }
}
