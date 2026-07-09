/**
 * Stage 4 / Pipeline Orchestrator – Architecture Pipeline
 *
 * Runs all 4 stages in sequence and returns the final ReactFlow-ready
 * ArchitectureGraph JSON.
 *
 * Stage 1 → RepositoryContext   (deterministic extraction)
 * Stage 2 → StaticArchitectureModel (deterministic analysis)
 * Stage 3 → AIExplanation       (Gemini explanation only)
 * Stage 4 → ArchitectureGraph   (ReactFlow node/edge assembly)
 */

import path from 'path';
import { ScanResult, TechnologyInfo } from '../../types';
import { Stage1_ContextBuilder } from './Stage1_ContextBuilder';
import { Stage2_StaticAnalyzer, ArchitectureComponent, StaticArchitectureModel } from './Stage2_StaticAnalyzer';
import { Stage3_AIExplainer } from './Stage3_AIExplainer';

// ─────────────────────────────────────────────────────────────────────────────
// Final output type (ReactFlow-ready)
// ─────────────────────────────────────────────────────────────────────────────
export interface ArchitectureGraph {
  repositoryType: string;
  architecturePattern: string;
  healthScore: number;
  summary: {
    pattern: string;
    type: string;
    componentsCount: number;
    framework: string;
    database: string;
    deployment: string;
    complexity: 'Low' | 'Medium' | 'High';
    aiSummary: string;
  };
  confidence: number;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  strengths: string[];
  risks: string[];
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  }>;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  technology: string;
  confidence: string;
  evidence: string[];
  description: string;
  data: {
    label: string;
    layerName: string;
    technology: string;
    health: 'healthy' | 'warning' | 'critical';
    confidence: string;
    description: string;
    evidence: string[];
    role: string;
    purpose: string;
    relatedFiles: string[];
    aiRecommendation: string;
    raw: {
      id: string;
      type: string;
      label: string;
      data: {
        technology: string;
        health: string;
        confidence: string;
        description: string;
        evidence: string[];
        role: string;
        purpose: string;
        relatedFiles: string[];
        aiRecommendation: string;
        details: any[];
      };
    };
  };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer order for vertical layout
// ─────────────────────────────────────────────────────────────────────────────

// The order layers appear top-to-bottom in the diagram
const LAYER_ORDER: Record<string, number> = {
  'ENTRY LAYER':          0,
  'ORCHESTRATION LAYER':  0,
  'ROUTING LAYER':        1,
  'MIDDLEWARE LAYER':     2,
  'INTERCEPTOR LAYER':    2,
  'AUTH LAYER':           2,
  'VALIDATION LAYER':     2,
  'CONTROLLER LAYER':     3,
  'PAGE LAYER':           3,
  'COMMAND LAYER':        3,
  'MODULE LAYER':         3,
  'APPLICATION LAYER':    3,
  'API LAYER':            3,
  'ADAPTER LAYER':        4,
  'COMPONENT LAYER':      4,
  'SERVICE LAYER':        4,
  'HOOK LAYER':           4,
  'CORE LAYER':           4,
  'DISPATCH LAYER':       4,
  'STATE LAYER':          5,
  'MODEL LAYER':          5,
  'PACKAGE LAYER':        5,
  'TRANSFORMER LAYER':    5,
  'INTERCEPTOR LAYER2':   5,
  'UTILITY LAYER':        6,
  'TYPE LAYER':           6,
  'HELPER LAYER':         6,
  'PLATFORM LAYER':       6,
  'TRANSFORM LAYER':      6,
  'CONFIG LAYER':         7,
  'DATA LAYER':           8,
  'DATABASE LAYER':       8,
  'CACHE LAYER':          8,
  'EXTERNAL LAYER':       9,
};

function layerRow(layer: string): number {
  return LAYER_ORDER[layer] ?? 5;
}

function healthFromConfidence(confidence: number): 'healthy' | 'warning' | 'critical' {
  if (confidence >= 80) return 'healthy';
  if (confidence >= 50) return 'warning';
  return 'critical';
}

function inferPrimaryFramework(model: StaticArchitectureModel, ctx: any): string {
  const deps = [...(ctx.packageJson?.dependencies || []), ...(ctx.packageJson?.devDependencies || [])];
  if (model.repositoryType.includes('NestJS'))  return 'NestJS';
  if (model.repositoryType.includes('Next.js')) return 'Next.js';
  if (model.repositoryType.includes('React'))   return 'React';
  if (model.repositoryType.includes('Express')) return 'Express';
  if (model.repositoryType.includes('Vue'))     return 'Vue.js';
  if (model.repositoryType.includes('Nuxt'))    return 'Nuxt.js';
  if (model.repositoryType.includes('Svelte'))  return 'Svelte';
  if (model.repositoryType.includes('FastAPI')) return 'FastAPI';
  if (model.repositoryType.includes('Flask'))   return 'Flask';
  if (model.repositoryType.includes('Django'))  return 'Django';
  if (model.repositoryType.includes('Go'))      return 'Go';
  return deps.find(d => ['react', 'vue', 'angular', 'svelte', 'express', 'fastify', 'koa', 'hono'].includes(d)) || 'None Detected';
}

function inferDatabase(ctx: any): string {
  const deps = ctx.packageJson?.dependencies || [];
  if (deps.includes('mongoose') || deps.includes('mongodb'))   return 'MongoDB';
  if (deps.includes('pg') || deps.includes('postgresql'))      return 'PostgreSQL';
  if (deps.includes('mysql2') || deps.includes('mysql'))       return 'MySQL';
  if (deps.includes('better-sqlite3') || deps.includes('sqlite3')) return 'SQLite';
  if (deps.includes('@prisma/client'))                         return 'via Prisma';
  if (deps.includes('drizzle-orm'))                            return 'via Drizzle';
  if (deps.includes('redis') || deps.includes('ioredis'))      return 'Redis';
  return 'None Detected';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────────────────────
export class ArchitecturePipeline {
  static async run(
    repoName: string,
    scanResult: ScanResult,
    technologyInfo: TechnologyInfo
  ): Promise<ArchitectureGraph> {
    const ctx = Stage1_ContextBuilder.build(repoName, scanResult, technologyInfo);
    const model = Stage2_StaticAnalyzer.analyze(ctx);
    const aiExplanation = await Stage3_AIExplainer.explain(ctx, model);
    return this.buildGraph(ctx, model, aiExplanation);
  }

  private static buildGraph(
    ctx: any,
    model: StaticArchitectureModel,
    ai: any
  ): ArchitectureGraph {
    const rows: Map<number, ArchitectureComponent[]> = new Map();
    model.components.forEach(comp => {
      const row = layerRow(comp.layer);
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row)!.push(comp);
    });

    const NODE_W = 370;
    const NODE_H = 260;

    const nodes: ArchitectureNode[] = [];

    const sortedRows = [...rows.entries()].sort(([a], [b]) => a - b);
    sortedRows.forEach(([rowIdx, comps], renderRowIdx) => {
      const startX = -((comps.length - 1) * NODE_W) / 2;
      const y = 80 + renderRowIdx * NODE_H;

      comps.forEach((comp, colIdx) => {
        const health = healthFromConfidence(comp.confidence);
        const confidenceStr = `${comp.confidence}%`;
        const aiRec = ai.nodeRecommendations?.[comp.id] || `Review ${comp.label} implementation.`;

        nodes.push({
          id:          comp.id,
          label:       comp.label,
          type:        comp.type,
          position:    { x: startX + colIdx * NODE_W, y },
          technology:  comp.technology,
          confidence:  confidenceStr,
          evidence:    comp.evidence,
          description: comp.purpose,
          data: {
            label:      comp.label,
            layerName:  comp.layer,
            technology: comp.technology,
            health,
            confidence: confidenceStr,
            description: comp.purpose,
            evidence:   comp.evidence,
            role:       comp.role,
            purpose:    comp.purpose,
            relatedFiles: comp.relatedFiles,
            aiRecommendation: aiRec,
            raw: {
              id:    comp.id,
              type:  comp.type,
              label: comp.label,
              data: {
                technology:  comp.technology,
                health,
                confidence:  confidenceStr,
                description: comp.purpose,
                evidence:    comp.evidence,
                role:       comp.role,
                purpose:    comp.purpose,
                relatedFiles: comp.relatedFiles,
                aiRecommendation: aiRec,
                details:     []
              }
            }
          }
        });
      });
    });

    const edges: ArchitectureEdge[] = model.relationships.map((r, i) => ({
      id:       `edge-${i}`,
      source:   r.source,
      target:   r.target,
      label:    r.label,
      animated: true
    }));

    const complexity: 'Low' | 'Medium' | 'High' =
      nodes.length <= 4  ? 'Low' :
      nodes.length <= 9  ? 'Medium' : 'High';

    return {
      repositoryType:     model.repositoryType,
      architecturePattern: model.architecturePattern,
      healthScore:        ai.healthScore || ai.confidence || 90,
      confidence:         ai.confidence,
      summary: {
        pattern:         model.architecturePattern,
        type:            model.repositoryType,
        componentsCount: nodes.length,
        framework:       inferPrimaryFramework(model, ctx),
        database:        inferDatabase(ctx),
        deployment:      ctx.deploymentFiles?.length > 0 ? ctx.deploymentFiles.join(', ').slice(0, 60) : 'None',
        complexity,
        aiSummary:       ai.summary
      },
      nodes,
      edges,
      strengths:       ai.strengths,
      risks:           ai.risks,
      recommendations: ai.recommendations
    };
  }
}
