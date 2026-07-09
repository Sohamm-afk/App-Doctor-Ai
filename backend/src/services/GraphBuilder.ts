import { 
  ArchitectureModel,
  ArchitectureNode, 
  ArchitectureEdge, 
  ArchitectureGraph
} from './ArchitectureService';

export class GraphBuilder {
  /**
   * Transforms the parsed architecture model
   * into a ReactFlow-compatible nodes and edges graph structure.
   * Consumes ONLY the ArchitectureModel.
   */
  public static buildGraph(model: ArchitectureModel): ArchitectureGraph {
    const nodes: ArchitectureNode[] = [];
    const edges: ArchitectureEdge[] = [];

    // Assign positions based on sorted execution layers
    model.layers.forEach((layer, layerIdx) => {
      const components = layer.components || [];
      if (components.length === 0) return;

      const layerY = 100 + layerIdx * 250; // Spaced 250px apart vertically
      const componentSpacing = 360; // Spaced 360px apart horizontally
      const startX = -((components.length - 1) * componentSpacing) / 2;

      components.forEach((comp, compIdx) => {
        const nodeX = startX + compIdx * componentSpacing;

        nodes.push({
          id: comp.id,
          label: comp.name,
          type: comp.layer, // maps to ReactFlow node type
          position: { x: nodeX, y: layerY },
          data: {
            label: comp.name,
            layerName: layer.name,
            technology: comp.detectedTechnology,
            health: 'healthy',
            confidence: comp.confidence === 'high' ? '100%' : (comp.confidence === 'medium' ? '80%' : '50%'),
            description: comp.description,
            details: comp.evidence
          }
        });
      });
    });

    // Generate graph edges from detected execution relationships
    model.relationships.forEach(rel => {
      edges.push({
        id: `edge-${rel.sourceComponentId}-${rel.targetComponentId}`,
        source: rel.sourceComponentId,
        target: rel.targetComponentId,
        label: rel.relationshipType
      });
    });

    return {
      pattern: model.pattern,
      type: model.type,
      nodes,
      edges,
      layers: model.layers,
      summary: model.summary,
      recommendations: model.recommendations,
      relationships: model.relationships
    };
  }
}
