/**
 * Stage 3 – AI Architecture Explainer
 *
 * Sends the VERIFIED static model to Gemini.
 *
 * Gemini's only job:
 *   1. Write an executive architecture summary
 *   2. Identify strengths based on detected components
 *   3. Identify risks based on what is present or absent
 *   4. Produce per-component AI recommendations
 *   5. Produce overall architecture recommendations
 *   6. Calculate a healthScore (0–100)
 *
 * Gemini must NOT invent new components or technologies.
 */

import { GeminiService } from '../geminiService';
import { RepositoryContext } from './Stage1_ContextBuilder';
import { StaticArchitectureModel } from './Stage2_StaticAnalyzer';

// ─────────────────────────────────────────────────────────────────────────────
// Output type
// ─────────────────────────────────────────────────────────────────────────────
export interface AIExplanation {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  }>;
  nodeRecommendations: Record<string, string>;  // componentId → one-sentence recommendation
  confidence: number;
  healthScore: number;  // 0–100 architectural health rating
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback (when Gemini is unavailable)
// ─────────────────────────────────────────────────────────────────────────────
function fallback(model: StaticArchitectureModel): AIExplanation {
  const nodeRecs: Record<string, string> = {};
  model.components.forEach(c => {
    nodeRecs[c.id] = `Review ${c.label} for adherence to the ${model.architecturePattern} conventions.`;
  });
  return {
    summary: `${model.repositoryType} following a ${model.architecturePattern}. ` +
      `Detected ${model.components.length} architectural components with ${model.confidence}% static analysis confidence.`,
    strengths: model.components.map(c => `${c.role}: ${c.label} is clearly separated and has verifiable evidence.`).slice(0, 4),
    risks: [
      model.components.find(c => c.type === 'database') ? null : 'No data persistence layer detected — consider adding one if required.',
      'AI explanation unavailable — see static analysis for full component details.',
    ].filter(Boolean) as string[],
    recommendations: [{
      id: 'rec-0', title: 'Add comprehensive test coverage',
      description: 'Ensure each detected component has associated test files.',
      severity: 'medium'
    }],
    nodeRecommendations: nodeRecs,
    confidence: model.confidence,
    healthScore: model.confidence
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 public API
// ─────────────────────────────────────────────────────────────────────────────
export class Stage3_AIExplainer {
  static async explain(
    ctx: RepositoryContext,
    model: StaticArchitectureModel
  ): Promise<AIExplanation> {

    // Build a compact but rich component summary for Gemini
    const componentList = model.components.map(c =>
      `  [${c.id}] "${c.label}"
    Role: ${c.role}
    Layer: ${c.layer}
    Purpose: ${c.purpose}
    Technology: ${c.technology}
    Confidence: ${c.confidence}%
    Evidence: ${c.evidence.slice(0, 3).join(', ')}`
    ).join('\n\n');

    const edgeList = model.relationships.map(r => {
      const src = model.components.find(c => c.id === r.source)?.label || r.source;
      const tgt = model.components.find(c => c.id === r.target)?.label || r.target;
      return `  ${src} ──[${r.label}]──► ${tgt}  (${r.relationshipType})`;
    }).join('\n');

    const componentIds = model.components.map(c => `"${c.id}"`).join(', ');

    const prompt = `You are a Principal Software Architect reviewing the output of a static code analysis engine.

The analysis engine has already determined the full architecture of this codebase.
Your role is ONLY to provide expert commentary — you must NOT invent new components, layers, or technologies.

════════════════════════════════════════════════
VERIFIED STATIC ANALYSIS — DO NOT DEVIATE FROM THIS
════════════════════════════════════════════════

Repository: ${ctx.name}
Type: ${model.repositoryType}
Architecture Pattern: ${model.architecturePattern}
Execution Flow: ${model.executionFlowDescription}
Detection Confidence: ${model.confidence}%
Languages: ${ctx.languages.join(', ') || 'Unknown'}
Package Manager: ${ctx.packageManager}
Files: ${ctx.stats.totalFiles}  |  Folders: ${ctx.stats.totalFolders}
Has Tests: ${ctx.testFiles.length > 0 ? `Yes (${ctx.testFiles.length} test files)` : 'No'}
Has Deployment: ${ctx.deploymentFiles.length > 0 ? ctx.deploymentFiles.join(', ') : 'None detected'}

Production Dependencies:
${ctx.packageJson.dependencies.slice(0, 30).join(', ') || 'None'}

Dev Dependencies:
${ctx.packageJson.devDependencies.slice(0, 20).join(', ') || 'None'}

Detected Architectural Components:
${componentList || 'None'}

Execution Flow Diagram (detected relationships):
${edgeList || 'None detected'}

════════════════════════════════════════════════
YOUR TASK
════════════════════════════════════════════════

Using ONLY the data above, provide a senior architect's review. Follow these rules:
1. NEVER mention Spring Boot, Django, Rails, PostgreSQL, Redis, Kafka, RabbitMQ, or ANY technology not listed above.
2. NEVER suggest adding architectural layers not relevant to this specific type of repository.
3. Base every observation on the VERIFIED components and their evidence files.
4. Keep strengths and risks specific — reference actual component names.
5. For nodeRecommendations, write ONE sentence per component: the single most important advice for improving that specific component.
6. healthScore should reflect the quality of the architecture as detected (consider: separation of concerns, test coverage, clear layering, dependency management).

Return ONLY this exact JSON — no markdown, no commentary:
{
  "summary": "3-4 sentence executive summary of the architecture",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3", "specific strength 4"],
  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "recommendations": [
    { "id": "rec-1", "title": "Short title", "description": "Actionable recommendation", "severity": "high" },
    { "id": "rec-2", "title": "Short title", "description": "Actionable recommendation", "severity": "medium" },
    { "id": "rec-3", "title": "Short title", "description": "Actionable recommendation", "severity": "low" }
  ],
  "nodeRecommendations": {
    ${componentIds.replace(/"([^"]+)"/g, '"$1": "One-sentence recommendation for this component"')}
  },
  "confidence": ${model.confidence},
  "healthScore": 0
}`;

    try {
      const raw     = await GeminiService.generateContent(prompt, true);
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed  = JSON.parse(cleaned) as AIExplanation;

      // Validate and normalise all fields
      const nodeRecs: Record<string, string> = {};
      model.components.forEach(c => {
        const fromAI = parsed.nodeRecommendations?.[c.id];
        nodeRecs[c.id] = typeof fromAI === 'string' && fromAI.length > 5
          ? fromAI
          : `Review ${c.label} to ensure it adheres to ${model.architecturePattern} conventions.`;
      });

      return {
        summary:  typeof parsed.summary === 'string' ? parsed.summary : fallback(model).summary,
        strengths: Array.isArray(parsed.strengths)       ? parsed.strengths.slice(0, 6)       : fallback(model).strengths,
        risks:     Array.isArray(parsed.risks)           ? parsed.risks.slice(0, 6)           : fallback(model).risks,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.slice(0, 6).map((r: any, i: number) => ({
              id:          r.id || `rec-${i}`,
              title:       r.title || 'Improve code quality',
              description: r.description || '',
              severity:    (['critical', 'high', 'medium', 'low', 'info'].includes(r.severity) ? r.severity : 'info') as any
            }))
          : fallback(model).recommendations,
        nodeRecommendations: nodeRecs,
        confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : model.confidence,
        healthScore: typeof parsed.healthScore === 'number' ? Math.min(100, Math.max(0, parsed.healthScore)) : model.confidence
      };
    } catch (err) {
      console.error('[Stage3_AIExplainer] AI explanation failed, using fallback:', (err as Error).message);
      return fallback(model);
    }
  }
}
