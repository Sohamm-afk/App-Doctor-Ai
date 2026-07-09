import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class PythonLibraryAnalyzer implements IRepositoryAnalyzer {
  name = 'PythonLibrary';

  supports(profile: any): boolean {
    return (profile.category === 'Library' || profile.category === 'AI Framework') && profile.primaryLanguage === 'Python';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { sourceFiles, entryPoints } = ctx;

    const { comp } = require('../Stage2_StaticAnalyzer');

    if (entryPoints.length) {
      components.push(comp('api-boundary', 'Python Library Interface', 'entry', 'Public API Layer', 'ENTRY LAYER',
        'Exports main modules, wrappers, and configuration functions.', 'Python SDK', 95, entryPoints, entryPoints, 0));
    }

    const coreFiles = sourceFiles.filter(f => f.toLowerCase().includes('/core/') || f.toLowerCase().includes('engine.py'));
    if (coreFiles.length) {
      components.push(comp('core', 'Core Engine', 'core', 'Core Engine', 'CORE ENGINE',
        'Implements core execution flow, schemas validation, and adapters mapping.', 'Python', 90, coreFiles.slice(0, 2), coreFiles, 1));
    }

    const utilFiles = sourceFiles.filter(f => f.toLowerCase().includes('/utils/') || f.toLowerCase().includes('helper.py'));
    if (utilFiles.length) {
      components.push(comp('helpers', 'Helper Utilities', 'helper', 'Utility Layer', 'UTILITY LAYER',
        'Stateless utility formatters and internal helper routines.', 'Python', 85, utilFiles.slice(0, 2), utilFiles, 2));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    if (components.find(c => c.id === 'api-boundary') && components.find(c => c.id === 'core')) {
      relationships.push(rel('api-boundary', 'core', 'calls core services', 'calls'));
    }
    if (components.find(c => c.id === 'core') && components.find(c => c.id === 'helpers')) {
      relationships.push(rel('core', 'helpers', 'imports helpers from', 'uses'));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 85;
  }
}
