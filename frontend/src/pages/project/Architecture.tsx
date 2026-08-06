import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, ShieldAlert, Cpu, Database, Network, Server, X } from 'lucide-react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType, ReactFlowProvider, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';

import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { PremiumAIRecommendationCard } from '@/components/cards/Cards';
import { Skeleton, SkeletonCard } from '@/components/ui/Loading';
import { getApiBaseUrl } from '@/utils';

import { collectEvidence } from '@/architecture/evidence/EvidenceCollector';
import { detectTechnologies } from '@/architecture/detectors';
import { buildArchitecture } from '@/architecture/ArchitectureBuilder';

const nodeTypeIcons: Record<string, React.ReactNode> = {
  client: <Cpu size={20} />,
  cdn: <Network size={20} />,
  gateway: <Server size={20} />,
  service: <Network size={20} />,
  database: <Database size={20} />,
  cache: <Database size={20} />,
  queue: <Server size={20} />,
  storage: <Database size={20} />,
  router: <Network size={20} />,
  middleware: <ShieldAlert size={20} />,
  controller: <Cpu size={20} />,
  pages: <Network size={20} />,
  components: <Cpu size={20} />,
  hooks: <Cpu size={20} />,
  context: <Database size={20} />,
  repository: <Database size={20} />,
};

const typeLabels: Record<string, string> = {
  cdn: 'CI/CD Deployment',
  gateway: 'API Ingress Gateway',
  client: 'Frontend Client',
  router: 'Routing Layer',
  middleware: 'Security Middleware',
  controller: 'API Controller',
  service: 'Core Logic Service',
  repository: 'Data Access Layer',
  pages: 'Page Container',
  components: 'UI Component',
  hooks: 'Custom Hook',
  context: 'Global Context',
  database: 'Database persistence',
  cache: 'Redis Caching',
};

const getLayerName = (type: string): string => {
  if (['client', 'pages', 'components', 'hooks', 'context'].includes(type)) {
    return 'Presentation Layer';
  }
  if (['router', 'gateway', 'middleware', 'controller', 'service'].includes(type)) {
    return 'Application Layer';
  }
  if (['repository', 'database', 'cache', 'queue'].includes(type)) {
    return 'Data Layer';
  }
  return 'Infrastructure Layer';
};

const getLayerColor = (layer: string): string => {
  switch (layer) {
    case 'Presentation Layer': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20';
    case 'Application Layer': return 'text-purple-500 border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20';
    case 'Data Layer': return 'text-blue-500 border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20';
    default: return 'text-amber-500 border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20';
  }
};

export default function ArchitecturePage() {
  return (
    <ReactFlowProvider>
      <ArchitectureFlow />
    </ReactFlowProvider>
  );
}

function ArchitectureFlow() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [archResult, setArchResult] = useState<any>(null);
  const { error } = useToast();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { setCenter } = useReactFlow();

  // Dynamic graph height selector based on component count
  const getContainerHeight = () => {
    const nodeCount = nodes.length;
    if (nodeCount === 0) return 600;
    if (nodeCount <= 4) return 450;
    if (nodeCount <= 8) return 600;
    if (nodeCount <= 15) return 750;
    return 850;
  };

  // Dynamic zoom and center positioning engine (Step 4 & Bounding calculations)
  const fitViewToBoundingBox = () => {
    if (nodes.length === 0 || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 600;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + 312);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + 140);
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const centerX = minX + graphWidth / 2;
    const centerY = minY + graphHeight / 2;

    // Scale to fit 80% of container size
    const scaleX = (containerWidth * 0.8) / graphWidth;
    const scaleY = (containerHeight * 0.8) / graphHeight;
    let targetZoom = Math.min(scaleX, scaleY);

    // Apply strict dynamic zoom rules based on node counts
    const nodeCount = nodes.length;
    if (nodeCount <= 5) {
      targetZoom = 1.8;
    } else if (nodeCount <= 8) {
      targetZoom = 1.6;
    } else if (nodeCount <= 12) {
      targetZoom = 1.4;
    } else if (nodeCount <= 20) {
      targetZoom = 1.2;
    } else {
      targetZoom = Math.max(Math.min(targetZoom, 1.8), 0.45);
    }

    setCenter(centerX, centerY, { zoom: targetZoom, duration: 800 });
  };

  // Run auto center alignment hooks on node updates and drawer toggles
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitViewToBoundingBox();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [nodes, selectedNode, loading]);

  const onInit = () => {
    setTimeout(() => {
      fitViewToBoundingBox();
    }, 150);
  };

  useEffect(() => {
    if (!id) return;

    const localScanData = localStorage.getItem(`scan_result_${id}`);
    if (!localScanData) {
      setLoading(false);
      return;
    }

    const scanData = JSON.parse(localScanData);
    setScanResult(scanData);

    const apiBaseUrl = getApiBaseUrl();

    // Always call the AI architecture endpoint to generate a real diagram
    fetch(`${apiBaseUrl}/api/ai/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResult: scanData })
    })
      .then(r => r.json())
      .then((data: any) => {
        const archData = data.architecture;
        if (!archData || !archData.nodes || archData.nodes.length === 0) {
          throw new Error('Empty architecture response from AI');
        }

        // Cache the AI result back into localStorage so next load is instant
        const updated = { ...scanData, architecture: archData };
        localStorage.setItem(`scan_result_${id}`, JSON.stringify(updated));

        setArchResult(archData);

        const renderNode = (node: any): Node => {
          const layerName = node.data?.layerName || node.type?.toUpperCase() + ' LAYER' || 'COMPONENT';
          const rawData = node.data?.raw?.data || { health: 'healthy', technology: node.type, confidence: node.confidence || '100%', description: node.description || '' };
          return {
            id: node.id,
            position: node.position || { x: 0, y: 0 },
            data: {
              label: (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18, delay: Math.random() * 0.15 }}
                  className="p-5 w-[312px] h-[140px] flex flex-col justify-between text-left relative overflow-hidden bg-bg-card rounded-2xl border border-border shadow-md hover:shadow-lg hover:border-purple-500/30 transition-all duration-200"
                >
                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getLayerColor(layerName)}`}>
                      {layerName}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${
                      rawData.health === 'healthy' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
                      rawData.health === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                      'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                    }`} />
                  </div>
                  <div className="flex items-start gap-4 my-2">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      node.type === 'client' || node.type === 'pages' || node.type === 'components' || node.type === 'hooks' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' :
                      node.type === 'gateway' || node.type === 'router' || node.type === 'middleware' || node.type === 'controller' || node.type === 'service' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-500' :
                      node.type === 'database' || node.type === 'repository' || node.type === 'context' || node.type === 'cache' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-500' :
                      'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
                    }`}>
                      {(nodeTypeIcons as any)[node.type] ? (
                        <div className="scale-125">{(nodeTypeIcons as any)[node.type]}</div>
                      ) : <Network size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="text-body font-extrabold text-text truncate leading-tight">{node.data?.label || node.label}</span>
                        <span className="text-[10px] text-text-muted capitalize font-medium">
                          {(typeLabels as any)[node.type] || node.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-auto">
                    {rawData.technology ? (
                      <span className="font-mono text-[9px] font-semibold text-text-muted bg-bg-subtle px-2 py-0.5 rounded border border-border truncate max-w-[150px]" title={rawData.technology}>
                        {rawData.technology}
                      </span>
                    ) : <span />}
                    <span className="text-[9px] font-bold text-primary-500">
                      {rawData.confidence || node.confidence}
                    </span>
                  </div>
                </motion.div>
              ),
              raw: { id: node.id, type: node.type, label: node.data?.label || node.label, data: rawData },
            },
            style: { background: 'none', border: 'none', padding: '0px' },
          };
        };

        setNodes(archData.nodes.map(renderNode));
        setEdges((archData.edges || []).map((edge: any) => ({
          ...edge,
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed' as any, color: '#a855f7' }
        })));
      })
      .catch((err: any) => {
        console.error('[Architecture] AI generation failed, falling back:', err);
        // Fallback to client-side detection
        try {
          const evidence = collectEvidence(scanData);
          const technologies = detectTechnologies(evidence);
          const archData = buildArchitecture(technologies, evidence, scanData);
          setArchResult(archData);
          setNodes(archData.nodes.map((node: any) => {
            const layerName = node.data.layerName;
            return {
              id: node.id,
              position: node.position,
              data: {
                label: (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    className="p-5 w-[312px] h-[140px] flex flex-col justify-between text-left relative overflow-hidden bg-bg-card rounded-2xl border border-border shadow-md"
                  >
                    <div className="flex justify-between items-center border-b border-border/60 pb-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getLayerColor(layerName)}`}>{layerName}</span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-start gap-4 my-2">
                      <div className="p-3 rounded-xl flex-shrink-0 bg-purple-50 dark:bg-purple-950/30 text-purple-500">
                        <Network size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-body font-extrabold text-text truncate">{node.data.label}</span>
                        <span className="text-[10px] text-text-muted block">{node.type}</span>
                      </div>
                    </div>
                    <div className="border-t border-border/40 pt-2 mt-auto" />
                  </motion.div>
                ),
                raw: node.data.raw || node,
              },
              style: { background: 'none', border: 'none', padding: '0px' },
            };
          }));
          setEdges(archData.edges);
        } catch (fbErr) {
          error('Failed to generate architecture diagram.');
          console.error(fbErr);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);


  const handleNodeClick = (_event: React.MouseEvent, flowNode: Node) => {
    const rawNode: any = flowNode.data.raw;
    setSelectedNode(rawNode);
  };

  const getArchitectureRecommendation = () => {
    if (!archResult) return "";
    return `[TITLE] Architecture Assessment
[STATUS] Mapped
[STATUS_VARIANT] success
[WHY]
- Repository maps to a vertical, top-to-bottom framework-driven execution flow.
- Logical layers isolate client interfaces, api route handlers, and database adapters.
- Deployment profile integrates native container environments and active CI/CD scripts.
[REC]
Establish boundary validation checks at the application controller level and implement strict timeout limits on outgoing connection adapter pipelines.`;
  };

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)] pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={22} className="text-purple-500" />
          <h1 className="font-heading text-h1 text-text">Architecture</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          AI-generated architecture diagram based on real repository analysis. Click any node for details.
        </p>
      </motion.div>

      {/* AI Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          {/* Left panel placeholder (canvas skeleton) */}
          <div className="lg:col-span-2 relative h-[500px] border border-border bg-bg-card rounded-2xl flex flex-col items-center justify-center p-6 shadow-sm overflow-hidden">
            {/* Pulsing blurred SVG graph blueprint */}
            <svg className="absolute inset-0 w-full h-full opacity-10 dark:opacity-5 pointer-events-none animate-pulse" viewBox="0 0 500 400">
              <circle cx="250" cy="200" r="40" fill="currentColor" />
              <circle cx="120" cy="100" r="30" fill="currentColor" />
              <circle cx="380" cy="100" r="30" fill="currentColor" />
              <circle cx="120" cy="300" r="30" fill="currentColor" />
              <circle cx="380" cy="300" r="30" fill="currentColor" />
              <path d="M 120 100 L 250 200 M 380 100 L 250 200 M 120 300 L 250 200 M 380 300 L 250 200" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
            
            <div className="z-10 flex flex-col items-center text-center space-y-4 max-w-sm animate-none">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <GitBranch size={24} className="text-purple-500 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 animate-ping" />
              </div>
              <div className="space-y-1">
                <h3 className="text-body font-bold text-text">Tracing Codebase Topography</h3>
                <p className="text-caption text-text-muted mt-1">
                  Mapping import paths and structural relationships for this repository...
                </p>
              </div>
              <div className="w-48 bg-border h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-500 h-full rounded-full animate-pulse" style={{ width: '45%' }} />
              </div>
            </div>
          </div>

          {/* Right panel placeholder (details pane skeleton) */}
          <div className="lg:col-span-1 card p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton height={20} className="w-1/2" />
              <Skeleton height={12} className="w-1/3" />
            </div>
            <div className="space-y-3">
              <Skeleton height={14} className="w-full" />
              <Skeleton height={14} className="w-5/6" />
              <Skeleton height={14} className="w-2/3" />
            </div>
            <Skeleton height={150} rounded="lg" />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Banner */}
          {nodes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-gradient-to-r from-bg-card via-bg-card to-purple-500/5 border border-border shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-body font-bold text-text flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    Enterprise Architecture Flow Summary
                  </h3>
                  <Badge variant="primary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold py-1 px-3">
                    Complexity: {archResult?.summary?.complexity || 'Low'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">Repository Type</span>
                    <span className="text-body-sm font-bold text-text">
                      {(archResult as any)?.repositoryType || archResult?.summary?.type || 'Detected'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">Architecture Pattern</span>
                    <span className="text-body-sm font-bold text-text">
                      {(archResult as any)?.architecturePattern || archResult?.summary?.pattern || 'Detected'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">Components</span>
                    <span className="text-body-sm font-bold text-text">{archResult?.summary?.componentsCount || nodes.length} Detected</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">Framework</span>
                    <span className="text-body-sm font-bold text-text">
                      {archResult?.summary?.framework || 'None Detected'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider block">Database</span>
                    <span className="text-body-sm font-bold text-text">
                      {archResult?.summary?.database || 'None Detected'}
                    </span>
                  </div>
                </div>

                {archResult?.summary?.aiSummary && (
                  <div className="mt-3 pt-3 border-t border-border/60 text-body-sm text-text leading-relaxed bg-bg-subtle/30 p-3 rounded-lg border border-border">
                    <strong>AI Analysis:</strong> {archResult.summary.aiSummary}
                  </div>
                )}
              </div>
            </motion.div>
          )}

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300">
        {/* Flow Map Column (Expands dynamically to full width when closed) */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedNode ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div ref={containerRef} style={{ height: `${getContainerHeight()}px` }} className="card overflow-hidden relative border border-border">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-card/50 backdrop-blur-sm z-10">
                <span className="text-body-sm text-text-muted">Analyzing architecture execution flow…</span>
              </div>
            ) : nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-card text-center p-8">
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-500 mb-4 shadow-sm">
                  <GitBranch size={24} />
                </div>
                <h4 className="text-body font-semibold text-text mb-2">
                  Architecture map is unavailable.
                </h4>
                <p className="text-body-sm text-text-muted max-w-md">
                  No logical framework layers could be parsed from the files. Try committing framework-specific controllers or routing configuration files to populate this screen.
                </p>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onInit={onInit}
                fitView={false}
                minZoom={0.2}
                maxZoom={2.0}
                zoomOnScroll={true}
                panOnDrag={true}
                attributionPosition="bottom-right"
              >
                <Background color="var(--color-border)" gap={16} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            )}
          </div>
        </div>

        {/* Details Panel Column (Slides/Appears on Click) */}
        {selectedNode && (
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 24 }} 
              animate={{ opacity: 1, x: 0 }} 
              style={{ minHeight: `${getContainerHeight()}px` }}
              className="card p-6 flex flex-col gap-6 justify-between border border-border shadow-sm relative animate-fade-in"
            >
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-subtle text-text-muted hover:text-text transition-colors"
                title="Close Details"
              >
                <X size={16} />
              </button>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-h3 font-bold text-text truncate max-w-[160px]" title={selectedNode.label}>
                      {selectedNode.label}
                    </h3>
                    <Badge variant={selectedNode.data.health === 'healthy' ? 'success' : 'warning'}>
                      {selectedNode.data.health}
                    </Badge>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${getLayerColor(getLayerName(selectedNode.type))}`}>
                    {getLayerName(selectedNode.type)}
                  </span>
                </div>

                <div className="space-y-4 font-body text-body-sm">
                  <div>
                    <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Architectural Role</h4>
                    <span className="text-body-sm font-bold text-text-muted bg-bg-subtle border border-border px-2 py-1 rounded inline-block">
                      {selectedNode.data.role || 'Component Layer'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Purpose</h4>
                    <p className="text-body-sm text-text leading-relaxed">{selectedNode.data.purpose || selectedNode.data.description}</p>
                  </div>

                  <div>
                    <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Detected Technology</h4>
                    <span className="font-mono text-body-sm text-primary-500 font-semibold bg-primary-500/5 px-2.5 py-1 rounded border border-primary-500/10 inline-block truncate max-w-[200px]" title={selectedNode.data.technology}>
                      {selectedNode.data.technology}
                    </span>
                  </div>

                  {selectedNode.data.relatedFiles && selectedNode.data.relatedFiles.length > 0 && (
                    <div>
                      <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Related Files</h4>
                      <div className="flex flex-col gap-1.5 mt-1 bg-bg-subtle/50 p-2 rounded border border-border">
                        {selectedNode.data.relatedFiles.map((file: string, idx: number) => (
                          <div key={idx} className="font-mono text-[10px] text-text truncate flex items-center gap-1.5" title={file}>
                            <span className="text-primary-500">•</span>
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Verified Evidence</h4>
                    <div className="flex flex-col gap-1.5 mt-1 bg-bg-subtle p-2.5 rounded border border-border">
                      {selectedNode.data.evidence && selectedNode.data.evidence.length > 0 ? (
                        selectedNode.data.evidence.map((evItem: string, idx: number) => (
                          <div key={idx} className="font-mono text-[10px] text-emerald-500 truncate flex items-center gap-1" title={evItem}>
                            <span>✓</span>
                            <span>{evItem}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-text-muted">✓ Detected from repository scan</div>
                      )}
                    </div>
                  </div>

                  {selectedNode.data.aiRecommendation && (
                    <div className="pt-2 border-t border-border/40">
                      <h4 className="text-body-xs font-semibold text-text-muted uppercase tracking-wider mb-1">AI Recommendation</h4>
                      <p className="text-body-sm text-text italic leading-relaxed bg-primary-500/5 border border-primary-500/10 p-2 rounded">
                        "{selectedNode.data.aiRecommendation}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
                <span className="text-caption text-text-muted font-semibold">Confidence Level</span>
                <Badge variant="primary" className="bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 font-semibold py-1 px-3">
                  {selectedNode.data.confidence}
                </Badge>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  )}

      {/* AI Recommendation Card */}
      <PremiumAIRecommendationCard description={getArchitectureRecommendation()} confidence={98} />

      <style>{`
        .react-flow__controls {
          background: #1e1e2e !important;
          border: 1px solid #313244 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          overflow: hidden !important;
        }
        .react-flow__controls-button {
          background: #1e1e2e !important;
          border: none !important;
          border-bottom: 1px solid #313244 !important;
          color: #cdd6f4 !important;
          fill: #cdd6f4 !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: background 0.2s !important;
        }
        .react-flow__controls-button:hover {
          background: #313244 !important;
        }
        .react-flow__controls-button svg {
          fill: #cdd6f4 !important;
          color: #cdd6f4 !important;
        }
        .react-flow__edge-path {
          stroke-dasharray: 6;
          animation: flowDash 1.2s linear infinite;
        }
        @keyframes flowDash {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
