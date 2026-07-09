import { IRepositoryAnalyzer } from '../IRepositoryAnalyzer';
import { RepositoryContext } from '../Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from '../Stage2_StaticAnalyzer';
import path from 'path';

export class ReactAnalyzer implements IRepositoryAnalyzer {
  name = 'React';

  supports(profile: any): boolean {
    return profile.framework === 'React';
  }

  extractComponents(ctx: RepositoryContext): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const { sourceFiles, allFolders } = ctx;

    const { comp } = require('../Stage2_StaticAnalyzer');

    const uiFolders = allFolders.filter(f => f.toLowerCase().includes('components/ui') || f.toLowerCase().endsWith('ui'));
    const compFiles = sourceFiles.filter(f => f.toLowerCase().includes('/components/'));
    const hookFiles = sourceFiles.filter(f => f.toLowerCase().includes('/hooks/') || path.basename(f).startsWith('use'));
    const storeFiles = sourceFiles.filter(f => f.toLowerCase().includes('store') || f.toLowerCase().includes('redux') || f.toLowerCase().includes('context'));

    const reactEntry = ctx.entryPoints.filter(e => {
      const base = path.basename(e).toLowerCase();
      return ['index.tsx', 'main.tsx', 'app.tsx', 'app.jsx', 'index.js', 'main.js'].includes(base);
    });

    if (reactEntry.length) {
      components.push(comp('bootstrap', 'React App Entry', 'entry', 'Client Bootstrap', 'ENTRY LAYER',
        'Bootstraps React DOM mounting, hooks up router, global context providers.', 'React DOM', 95, reactEntry, reactEntry, 0));
    }
    if (compFiles.length || uiFolders.length) {
      components.push(comp('components', 'UI Components', 'component', 'Presentation Layer', 'COMPONENT LAYER',
        'Reusable presentation UI components rendering view layouts.', 'React Component', 90,
        [...uiFolders, ...compFiles].slice(0, 4), compFiles, 3));
    }
    if (hookFiles.length) {
      components.push(comp('hooks', 'React Hooks', 'hook', 'State & Effect Logic', 'HOOK LAYER',
        'Custom hooks encapsulating state handlers and side effects.', 'React Hooks', 88, hookFiles.slice(0, 2), hookFiles, 2));
    }
    if (storeFiles.length) {
      components.push(comp('store', 'State Management Store', 'store', 'State Layer', 'STATE LAYER',
        'Global state management (Zustand, Redux, Context) syncing application states.', 'State Store', 88, storeFiles.slice(0, 2), storeFiles, 1));
    }

    return components;
  }

  extractRelationships(ctx: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    const { rel } = require('../Stage2_StaticAnalyzer');

    const hookFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('/hooks/') || path.basename(f).startsWith('use'));
    const storeFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('store') || f.toLowerCase().includes('redux') || f.toLowerCase().includes('context'));
    const compFiles = ctx.sourceFiles.filter(f => f.toLowerCase().includes('/components/'));

    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'store')) {
      relationships.push(rel('bootstrap', 'store', 'registers context store providers', 'Registers', 'out', 90, storeFiles.slice(0, 1)));
    }
    if (components.find(c => c.id === 'bootstrap') && components.find(c => c.id === 'components')) {
      relationships.push(rel('bootstrap', 'components', 'renders root page components', 'Creates', 'out', 95, compFiles.slice(0, 1)));
    }
    if (components.find(c => c.id === 'components') && components.find(c => c.id === 'hooks')) {
      relationships.push(rel('components', 'hooks', 'binds hook data cycles', 'Uses', 'out', 92, hookFiles.slice(0, 2)));
    }
    if (components.find(c => c.id === 'components') && components.find(c => c.id === 'store')) {
      relationships.push(rel('components', 'store', 'connects global state selectors', 'Uses', 'out', 90, compFiles.slice(0, 2)));
    }

    return relationships;
  }

  calculateConfidence(profile: any, components: ArchitectureComponent[]): number {
    return profile.confidence || 90;
  }
}
