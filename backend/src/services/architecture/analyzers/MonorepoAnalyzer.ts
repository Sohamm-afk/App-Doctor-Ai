import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class MonorepoAnalyzer implements IRepositoryAnalyzer {
  name = 'Monorepo';

  supports(profile: any): boolean {
    return profile.category === 'Monorepo';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const folders = ctx.allFolders;

    const { comp } = require('../Stage2_StaticAnalyzer');

    const pkgFolders = folders.filter(f => {
      const parts = f.split(/[/\\]/);
      return parts.length === 2 && (f.startsWith('packages/') || f.startsWith('apps/'));
    });

    pkgFolders.forEach((pkg, idx) => {
      const name = path.basename(pkg);
      const parent = path.dirname(pkg);
      const role = parent === 'apps' ? 'Application Service' : 'Shared Package';
      const layer = parent === 'apps' ? 'APPLICATION LAYER' : 'PACKAGE LAYER';
      const type = parent === 'apps' ? 'component' : 'module';
      
      components.push(comp(`pkg-${idx}`, name, type, role, layer,
        `Isolated monorepo package serving as a ${role.toLowerCase()}.`, 'Workspace Component', 90, [pkg], [pkg], idx));
    });

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    return [];
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
