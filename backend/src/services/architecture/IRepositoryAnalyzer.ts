import { RepositoryContext } from './Stage1_ContextBuilder';
import { ArchitectureComponent, ArchitectureRelationship } from './Stage2_StaticAnalyzer';

export interface IRepositoryAnalyzer {
  name: string;
  supports(profile: any): boolean;
  extractComponents(context: RepositoryContext): ArchitectureComponent[];
  extractRelationships(context: RepositoryContext, components: ArchitectureComponent[]): ArchitectureRelationship[];
  calculateConfidence(profile: any, components: ArchitectureComponent[]): number;
}
