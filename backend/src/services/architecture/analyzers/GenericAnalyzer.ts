import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class GenericAnalyzer implements IRepositoryAnalyzer {
  name = 'Generic';

  supports(profile: any): boolean {
    return true; // Fallback
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { entryPoints, allFolders } = ctx;

    const { comp } = require('../Stage2_StaticAnalyzer');

    if (entryPoints.length) {
      components.push(comp('entry', 'Application Entry', 'entry', 'Entry Point', 'ENTRY LAYER',
        'Main entry point loading dependencies.', 'JavaScript/Node.js', 80, entryPoints, entryPoints, 0));
    }

    const topFolders = allFolders.filter(f => !f.includes('/') && !f.includes('\\'));
    topFolders.forEach((f, i) => {
      components.push(comp(`folder-${i}`, f, 'module', 'Module Layer', 'MODULE LAYER',
        `Directory folder providing ${f} modules.`, 'JavaScript', 70, [f], [f], i + 1));
    });

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    return [];
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return 70;
  }
}
