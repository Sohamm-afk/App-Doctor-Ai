import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class NodeLibraryAnalyzer implements IRepositoryAnalyzer {
  name = 'NodeLibrary';

  supports(profile: any): boolean {
    return profile.category === 'Library' && (profile.primaryLanguage === 'TypeScript' || profile.primaryLanguage === 'JavaScript');
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { allFolders, sourceFiles, entryPoints } = ctx;

    const { comp } = require('../Stage2_StaticAnalyzer');

    if (entryPoints.length) {
      components.push(comp('api-boundary', 'Public API Boundary', 'entry', 'Public API Layer', 'ENTRY LAYER',
        'The public API exports mapping classes and helper wrappers for developers.', 'TypeScript/JavaScript', 95, entryPoints, entryPoints, 0));
    }

    const adapterFolder = allFolders.filter(f => f.toLowerCase().includes('adapter'));
    const adapterFiles = sourceFiles.filter(f => f.toLowerCase().includes('/adapters/'));
    if (adapterFiles.length || adapterFolder.length) {
      components.push(comp('adapters', 'Client Transport Adapters', 'adapter', 'Adapter Layer', 'ADAPTER LAYER',
        'Selected transport handlers (e.g. XMLHttpRequest vs Node http) bridging environments.', 'Client Transport', 90,
        [...adapterFolder, ...adapterFiles].slice(0, 2), adapterFiles, 2));
    }

    const coreFiles = sourceFiles.filter(f => f.toLowerCase().includes('/core/'));
    if (coreFiles.length) {
      components.push(comp('core', 'Core Request Engine', 'core', 'Core Engine', 'CORE ENGINE',
        'Manages payload formatting, config aggregation, and interceptor queues.', 'JavaScript Core', 90,
        coreFiles.slice(0, 2), coreFiles, 1));
    }

    const helperFiles = sourceFiles.filter(f => f.toLowerCase().includes('/helpers/') || f.toLowerCase().includes('/utils/'));
    if (helperFiles.length) {
      components.push(comp('helpers', 'Internal Helper Utilities', 'helper', 'Utility Layer', 'UTILITY LAYER',
        'Stateless formatters, content builders, header utilities.', 'JavaScript', 85,
        helperFiles.slice(0, 2), helperFiles, 3));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    if (components.find(c => c.id === 'api-boundary') && components.find(c => c.id === 'core')) {
      relationships.push(rel('api-boundary', 'core', 'routes request call to', 'calls'));
    }
    if (components.find(c => c.id === 'core') && components.find(c => c.id === 'adapters')) {
      relationships.push(rel('core', 'adapters', 'delegates request to', 'delegates'));
    }
    if (components.find(c => c.id === 'core') && components.find(c => c.id === 'helpers')) {
      relationships.push(rel('core', 'helpers', 'utilizes utilities from', 'uses'));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 85;
  }
}
