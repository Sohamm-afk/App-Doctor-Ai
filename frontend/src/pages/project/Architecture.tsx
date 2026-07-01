import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, ShieldAlert, Cpu, Database, Network, Server, ArrowRight } from 'lucide-react';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

import { mockService } from '@/services/mock';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { ArchitectureNode } from '@/types';

const nodeTypeIcons: Record<string, React.ReactNode> = {
  client: <Cpu size={14} />,
  cdn: <Network size={14} />,
  gateway: <Server size={14} />,
  service: <Network size={14} />,
  database: <Database size={14} />,
  cache: <Database size={14} />,
  queue: <Server size={14} />,
  storage: <Database size={14} />,
};

const nodeHealthColors: Record<string, string> = {
  healthy: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-500 bg-amber-50 text-amber-800',
  critical: 'border-red-500 bg-red-50 text-red-800',
  unknown: 'border-secondary-300 bg-bg-subtle text-text-muted',
};

export default function ArchitecturePage() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { error } = useToast();

  useEffect(() => {
    if (!id) return;
    mockService.getArchitecture(id)
      .then((data) => {
        // Map mock architecture nodes to React Flow Node structure
        const flowNodes: Node[] = data.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: {
          label: (
            <div className="flex flex-col items-center text-center p-1.5 min-w-[120px]">
              <div className="flex items-center gap-1 mb-1">
                {nodeTypeIcons[node.type] || <Network size={14} />}
                <span className="text-caption font-bold">{node.label}</span>
              </div>
              {node.data.technology && (
                <span className="text-[10px] text-text-muted font-mono">{node.data.technology}</span>
              )}
              {node.data.health && (
                <span className={`mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  node.data.health === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  node.data.health === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {node.data.health}
                </span>
              )}
            </div>
          ),
          raw: node,
        },
        style: {
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          color: 'var(--color-text)',
          padding: '0px',
        },
      }));

      // Map mock architecture edges to React Flow Edge structure
      const flowEdges: Edge[] = data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'smoothstep',
        style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
        animated: edge.source === 'node-client' || edge.source === 'node-gateway',
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      setLoading(false);
    }).catch((err) => {
      error('Failed to load architecture map', err instanceof Error ? err.message : String(err));
      setLoading(false);
    });
  }, [id, error]);

  const handleNodeClick = (_event: React.MouseEvent, flowNode: Node) => {
    const rawNode: ArchitectureNode = flowNode.data.raw;
    setSelectedNode(rawNode);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={22} className="text-purple-500" />
          <h1 className="font-heading text-h1 text-text">Architecture</h1>
        </div>
        <p className="text-body-sm text-text-muted">
          Explore the auto-discovered node map of service dependencies and API configurations. Click nodes for details.
        </p>
      </motion.div>

      {/* React Flow Workspace */}
      <div className="flex-1 card overflow-hidden min-h-[450px] relative border border-border">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-card/50 backdrop-blur-sm z-10">
            <span className="text-body-sm text-text-muted">Loading architecture map…</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="var(--color-border)" gap={16} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {/* Slide-over details drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedNode?.label ?? 'Node Details'}
        description={`Type: ${selectedNode?.type ?? 'Service Node'}`}
      >
        {selectedNode && (
          <div className="space-y-6">
            <div>
              <h4 className="text-body-sm font-semibold text-text mb-1">Overview</h4>
              <p className="text-body-sm text-text-muted">{selectedNode.data.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-caption text-text-muted block">Technology Stack</span>
                <span className="font-mono text-body-sm text-text font-medium bg-bg-subtle px-2 py-1 rounded border border-border">
                  {selectedNode.data.technology || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-caption text-text-muted block">Health Status</span>
                {selectedNode.data.health && (
                  <Badge variant={selectedNode.data.health === 'healthy' ? 'success' : selectedNode.data.health === 'warning' ? 'warning' : 'critical'} dot>
                    {selectedNode.data.health}
                  </Badge>
                )}
              </div>
            </div>

            {/* Render Node Metrics */}
            {selectedNode.data.metrics && Object.keys(selectedNode.data.metrics).length > 0 && (
              <div>
                <h4 className="text-body-sm font-semibold text-text mb-2">Metrics</h4>
                <div className="border border-border rounded-xl overflow-hidden bg-bg-subtle divide-y divide-border">
                  {Object.entries(selectedNode.data.metrics).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-caption text-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-body-sm font-semibold text-text font-mono">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="text-body-sm font-semibold text-text">Discovered Connections</h4>
              <p className="text-caption text-text-muted">
                Communicates with surrounding services using REST APIs and system connections.
              </p>
              <Button size="sm" variant="outline" rightIcon={<ArrowRight size={12} />} className="w-full">
                Audit API Endpoints
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
