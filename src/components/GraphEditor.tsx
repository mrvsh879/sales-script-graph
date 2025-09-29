// src/components/GraphEditor.tsx
// Full‑screen node/edge editor with Minimap for your sales‑script graph
// Drop‑in component. Works with the GraphData/GraphNode types from App.tsx.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  useEdgesState,
  useNodesState,
  MarkerType,
  Handle,
  Position
} from "reactflow";

// IMPORTANT: reactflow styles are imported globally in index.css
// @import 'reactflow/dist/style.css';

// === Types must mirror your App.tsx ===
type NodeType = "greeting" | "router" | "question" | "snippet";

interface Transition { label: string; to: string }
interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  text?: string[];
  transitions?: Transition[];
}

interface Edge { from: string; to: string; label: string }
interface GraphUI {
  sticky_comment_panel?: boolean;
  sticky_comment_title?: string;
  sticky_comment_position?: "left" | "right";
}
interface GraphData { nodes: GraphNode[]; edges?: Edge[]; ui?: GraphUI }

// === Props ===
interface GraphEditorProps {
  open: boolean;
  onClose: () => void;
  value: GraphData;                 // current graph
  onChange: (g: GraphData) => void; // save back to App
}

// === Helpers ===
const genId = (prefix = "node") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const typeColors: Record<NodeType, string> = {
  greeting: "#10b981",
  router:   "#06b6d4",
  question: "#8b5cf6",
  snippet:  "#38bdf8",
};

// Convert GraphData -> RF nodes/edges for visual editing
function toReactFlow(g: GraphData): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = g.nodes.map((n, idx) => ({
    id: n.id,
    position: { x: (idx % 6) * 260, y: Math.floor(idx / 6) * 160 }, // simple layout; user can rearrange
    data: { title: n.title, type: n.type, text: (n.text ?? []).join("\n") },
    style: {
      borderRadius: 14,
      padding: 10,
      border: `1px solid rgba(255,255,255,0.08)`,
      background: "var(--rf-node-bg, rgba(24,24,27,0.7))",
      color: "var(--rf-node-fg, #e5e7eb)",
      boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
      minWidth: 220,
    },
  }));

  // Prefer explicit edges if exist; else derive from transitions
  const edgeList: Edge[] = (g.edges && g.edges.length)
    ? g.edges
    : g.nodes.flatMap(n => (n.transitions ?? []).map(tr => ({ from: n.id, to: tr.to, label: tr.label })));

  const edges: RFEdge[] = edgeList.map((e, i) => ({
    id: `e-${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    label: e.label || "→",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 },
    style: { strokeWidth: 2 },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 8,
    labelBgStyle: { fill: "rgba(17,24,39,0.6)", stroke: "rgba(255,255,255,0.08)" },
  }));

  return { nodes, edges };
}

// Convert RF back -> GraphData (edges preferred over transitions)
function fromReactFlow(nodes: RFNode[], edges: RFEdge[], prev: GraphData): GraphData {
  const nextNodes: GraphNode[] = nodes.map((n) => ({
    id: n.id,
    title: n.data?.title ?? String(n.id),
    type: (n.data?.type as NodeType) ?? "snippet",
    text: String(n.data?.text ?? "").split("\n").filter(Boolean),
  }));

  const nextEdges: Edge[] = edges.map((e) => ({
    from: e.source as string,
    to: e.target as string,
    label: String(e.label ?? "→"),
  }));

  return { nodes: nextNodes, edges: nextEdges, ui: prev.ui };
}

// Lightweight node renderer (title + type pill)
const RFNodeContent: React.FC<{ data: any }> = ({ data }) => {
  const color = typeColors[data.type as NodeType] ?? "#94a3b8";
  return (
    <div style={{ display: "grid", gap: 6 }}>    
      <div style={{ display: "grid", gap: 6, position: 'relative' }}>
        {/* точки подключения */}
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
        <span style={{
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 999,
          background: `${color}20`,
          border: `1px solid ${color}60`,
          color,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}>{String(data.type).toUpperCase()}</span>
        <span style={{ fontWeight: 700 }}>{data.title}</span>
      </div>
      {!!data.text && (
        <div style={{ fontSize: 12, whiteSpace: "pre-wrap", opacity: 0.9 }}>
          {String(data.text).slice(0, 160)}{String(data.text).length > 160 ? "…" : ""}
        </div>
      )}
    </div>
  );
};

// === Main component ===
const GraphEditor: React.FC<GraphEditorProps> = ({ open, onClose, value, onChange }) => {
  const initial = useMemo(() => toReactFlow(value), [value]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // selection for side panel editing
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  useEffect(() => {
    if (!open) return;
    setNodes(initial.nodes);
    setEdges(initial.edges);
    setSelectedNodeId(null);
  }, [open, initial.nodes, initial.edges, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    setEdges((eds) => addEdge({ ...c, label: "→", markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  const addNode = () => {
    const id = genId("n");
    setNodes((ns) => ([
      ...ns,
      {
        id,
        position: { x: 80 + Math.random() * 240, y: 80 + Math.random() * 180 },
        data: { title: "Новий вузол", type: "snippet", text: "" },
        style: {
          borderRadius: 14,
          padding: 10,
          border: `1px solid rgba(255,255,255,0.08)`,
          background: "var(--rf-node-bg, rgba(24,24,27,0.7))",
          color: "var(--rf-node-fg, #e5e7eb)",
          boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
          minWidth: 220,
        },
      },
    ]));
  };

  const deleteSelection = () => {
    if (selectedNodeId) {
      setEdges((es) => es.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setNodes((ns) => ns.filter(n => n.id !== selectedNodeId));
      setSelectedNodeId(null);
    }
  };

  const saveBack = () => {
    const next = fromReactFlow(nodes, edges, value);
    onChange(next);
  };

  const downloadJSON = () => {
    const next = fromReactFlow(nodes, edges, value);
    const blob = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "graph.edited.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const uploadJSON = (file: File) => {
    file.text().then((txt) => {
      const parsed = JSON.parse(txt) as GraphData;
      const rf = toReactFlow(parsed);
      setNodes(rf.nodes); setEdges(rf.edges);
    }).catch((e) => alert("Помилка читання файлу: " + e));
  };

  // Simple inline node editor
  const updateNodeData = (patch: Partial<{ title: string; type: NodeType; text: string }>) => {
    if (!selectedNodeId) return;
    setNodes((ns) => ns.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  // Edge label prompt
  const editEdgeLabel = (edgeId: string) => {
    const label = prompt("Мітка переходу:", String(edges.find(e => e.id === edgeId)?.label ?? "→"));
    if (label == null) return;
    setEdges((es) => es.map(e => e.id === edgeId ? { ...e, label } : e));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-3 md:p-6">
      <div className="mx-auto max-w-[1600px] h-full rounded-2xl overflow-hidden border border-white/10 bg-[#0b0e14] text-zinc-200 grid grid-rows-[56px_1fr]">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 md:px-4 border-b border-white/10 bg-white/5">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">✕ Закрити</button>
          <button onClick={saveBack} className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500">💾 Зберегти у застосунок</button>
          <button onClick={addNode} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">＋ Додати вузол</button>
          <button onClick={deleteSelection} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">🗑 Видалити вибране</button>
          <button onClick={downloadJSON} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">⬇︎ Експорт JSON</button>
          <label className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 cursor-pointer">
            ⬆︎ Імпорт JSON
            <input type="file" accept="application/json" className="hidden" onChange={(e) => {
              const f = e.currentTarget.files?.[0]; if (f) uploadJSON(f);
            }} />
          </label>
          <div className="ml-auto text-xs opacity-70">Режим редагування графа з міні‑мапою</div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-[1fr_320px] h-full">
          {/* Canvas */}
          <div className="relative h-full">
            <ReactFlow
              style={{ width: '100%', height: '100%' }}
              nodes={nodes.map(n => ({ ...n, data: { ...n.data }, type: "default" }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={{ default: RFNodeContent as any }}
              onEdgeDoubleClick={(_, edge) => editEdgeLabel(edge.id)}
            >
              <MiniMap zoomable pannable nodeStrokeWidth={2} nodeColor={(n) => typeColors[(n.data as any)?.type as NodeType] ?? "#94a3b8"} maskColor="rgba(2,6,23,0.65)" />
              <Controls position="bottom-left" showInteractive={false} />
              <Background variant={BackgroundVariant.Dots} gap={18} />
            </ReactFlow>
          </div>

          {/* Side editor */}
          <div className="border-l border-white/10 bg-white/5 p-3 md:p-4 overflow-auto">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Властивості вузла</div>

            {!selectedNode && (
              <div className="text-zinc-400 text-sm opacity-80">Оберіть вузол, щоб змінити заголовок, тип або текст. Подвійний клік по ребру — зміна підпису переходу.</div>
            )}

            {selectedNode && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400">id: {selectedNode.id}</div>

                <label className="block text-sm">Заголовок
                  <input
                    className="mt-1 w-full rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2"
                    value={String(selectedNode.data?.title ?? "")}
                    onChange={(e) => updateNodeData({ title: e.target.value })}
                  />
                </label>

                <label className="block text-sm">Тип вузла
                  <select
                    className="mt-1 w-full rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2"
                    value={String(selectedNode.data?.type ?? "snippet")}
                    onChange={(e) => updateNodeData({ type: e.target.value as NodeType })}
                  >
                    <option value="greeting">greeting</option>
                    <option value="router">router</option>
                    <option value="question">question</option>
                    <option value="snippet">snippet</option>
                  </select>
                </label>

                <label className="block text-sm">Текст (по одному рядку на абзац)
                  <textarea
                    className="mt-1 w-full h-48 rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2"
                    value={String(selectedNode.data?.text ?? "")}
                    onChange={(e) => updateNodeData({ text: e.target.value })}
                  />
                </label>

                <div className="pt-2 flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => setSelectedNodeId(null)}>Зняти виділення</button>
                  <button className="px-3 py-1.5 rounded-lg bg-rose-700/80 hover:bg-rose-600" onClick={deleteSelection}>Видалити вузол</button>
                </div>

                <div className="pt-3 text-xs text-zinc-400">Підказка: зʼєднуйте вузли перетягуванням зʼєднувачів; подвійний клік по ребру — змінити мітку.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphEditor;
