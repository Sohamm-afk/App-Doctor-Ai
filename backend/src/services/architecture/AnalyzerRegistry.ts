import { IRepositoryAnalyzer } from './IRepositoryAnalyzer';
import { NestAnalyzer } from './analyzers/NestAnalyzer';
import { NextAnalyzer } from './analyzers/NextAnalyzer';
import { ReactAnalyzer } from './analyzers/ReactAnalyzer';
import { ExpressAnalyzer } from './analyzers/ExpressAnalyzer';
import { FastAPIAnalyzer } from './analyzers/FastAPIAnalyzer';
import { NodeLibraryAnalyzer } from './analyzers/NodeLibraryAnalyzer';
import { PythonLibraryAnalyzer } from './analyzers/PythonLibraryAnalyzer';
import { MonorepoAnalyzer } from './analyzers/MonorepoAnalyzer';
import { GenericAnalyzer } from './analyzers/GenericAnalyzer';

export class AnalyzerRegistry {
  private static analyzers: IRepositoryAnalyzer[] = [
    new NestAnalyzer(),
    new NextAnalyzer(),
    new ReactAnalyzer(),
    new ExpressAnalyzer(),
    new FastAPIAnalyzer(),
    new NodeLibraryAnalyzer(),
    new PythonLibraryAnalyzer(),
    new MonorepoAnalyzer()
  ];

  private static fallback = new GenericAnalyzer();

  static getAnalyzerForProfile(profile: any): IRepositoryAnalyzer {
    // Filter matching analyzers
    const matched = this.analyzers.filter(a => a.supports(profile));

    if (matched.length === 0) {
      return this.fallback;
    }

    if (matched.length === 1) {
      return matched[0];
    }

    // Sort by confidence or capability weight
    // If multiple match, we can check their score
    return matched[0];
  }
}
