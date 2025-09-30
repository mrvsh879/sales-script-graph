// src/components/GraphEditor.tsx
// Full-screen node/edge editor with Minimap for your sales-script graph
// Drop-in component. Works with the GraphData/GraphNode types from App.tsx.

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
  Position,
} from "reactflow";
import type { ReactFlowInstance } from "reactflow";

// ВАЖНО: в index.css должен быть импорт стилей React Flow:
// @import 'reactflow/dist/style.css';

// === Types (совместимы с App.tsx) ===
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

// === Пропсы редактора ===
interface GraphEditorProps {
  open: boolean;
  onClose: () => void;
  value: GraphData;                 // входной граф
  onChange: (g: GraphData) => void; // сохранить обратно в App
}

// === Утилиты ===
const genId = (prefix = "node") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const typeColors: Record<NodeType, string> = {
  greeting: "#10b981",
  router:   "#06b6d4",
  question: "#8b5cf6",
  snippet:  "#38bdf8",
};

// === Simple BFS layout (levels) ===
function layoutByLevels(
  nodes: RFNode[],
  edges: RFEdge[],
  opts: { xGap?: number; yGap?: number; startId?: string } = {}
): RFNode[] {
  const xGap = opts.xGap ?? 320;
  const yGap = opts.yGap ?? 180;

  const out = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  nodes.forEach(n => { out.set(n.id, []); inDeg.set(n.id, 0); });
  edges.forEach(e => {
    out.get(String(e.source))!.push(String(e.target));
    inDeg.set(String(e.target), (inDeg.get(String(e.target)) ?? 0) + 1);
  });

  let roots: string[] = [];
  const greeting = nodes.find(n => (n.data?.type ?? "") === "greeting")?.id;
  if (opts.startId) roots = [opts.startId];
  else if (greeting) roots = [greeting];
  else roots = nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0).map(n => n.id);
  if (!roots.length) roots = [nodes[0].id];

  const level = new Map<string, number>();
  const q = [...roots];
  roots.forEach(r => level.set(r, 0));
  while (q.length) {
    const v = q.shift()!;
    for (const w of out.get(v) ?? []) {
      if (!level.has(w)) {
        level.set(w, (level.get(v) ?? 0) + 1);
        q.push(w);
      }
    }
  }

  const buckets = new Map<number, string[]>();
  nodes.forEach(n => {
    const L = level.get(n.id) ?? 0;
    if (!buckets.has(L)) buckets.set(L, []);
    buckets.get(L)!.push(n.id);
  });

  const laid = nodes.map(n => ({ ...n }));
  for (const [L, ids] of Array.from(buckets.entries()).sort((a,b) => a[0]-b[0])) {
    ids.sort();
    const rowWidth = (ids.length - 1) * xGap;
    const x0 = -rowWidth / 2;
    ids.forEach((id, i) => {
      const node = laid.find(nn => nn.id === id)!;
      node.position = { x: x0 + i * xGap, y: L * yGap };
    });
  }
  return laid;
}

// GraphData -> ReactFlow
function toReactFlow(g: GraphData): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = g.nodes.map((n, idx) => ({
    id: n.id,
    position: { x: (idx % 6) * 260, y: Math.floor(idx / 6) * 160 },
    data: { title: n.title, type: n.type, text: (n.text ?? []).join("\n") },
    style: {
      borderRadius: 14,
      padding: 10,
      border: `1px solid rgba(0,0,0,0.06)`,
      background: "var(--rf-node-bg, rgba(24,24,27,0.7))",
      color: "var(--rf-node-fg, #e5e7eb)",
      boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
      minWidth: 220,
    },
  }));

  const edgeList: Edge[] =
    g.edges && g.edges.length
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

// ReactFlow -> GraphData
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

// Отрисовка ноды (бейдж типа + заголовок + краткий текст) + хэндлы
const RFNodeContent: React.FC<{ data: any }> = ({ data }) => {
  const color = typeColors[data.type as NodeType] ?? "#94a3b8";
  return (
    <div style={{ display: "grid", gap: 6, position: "relative" }}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="drag-handle" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "grab" }}>
        <span
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 999,
            background: `${color}20`,
            border: `1px solid ${color}60`,
            color,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          {String(data.type).toUpperCase()}
        </span>
        <span style={{ fontWeight: 700 }}>{data.title}</span>
      </div>
      {!!data.text && (
        <div style={{ fontSize: 12, whiteSpace: "pre-wrap", opacity: 0.9 }}>
          {String(data.text).slice(0, 160)}
          {String(data.text).length > 160 ? "…" : ""}
        </div>
      )}
    </div>
  );
};

// === Компонент редактора ===
const GraphEditor: React.FC<GraphEditorProps> = ({ open, onClose, value, onChange }) => {
  const initial = useMemo(() => toReactFlow(value), [value]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [edgeLabelsVisible, setEdgeLabelsVisible] = useState(false);
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
          border: `1px solid rgba(0,0,0,0.06)`,
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
      setNodes(rf.nodes);
      setEdges(rf.edges);
    }).catch((e) => alert("Помилка читання файлу: " + e));
  };

  const updateNodeData = (patch: Partial<{ title: string; type: NodeType; text: string }>) => {
    if (!selectedNodeId) return;
    setNodes((ns) => ns.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  const editEdgeLabel = (edgeId: string) => {
    const label = prompt("Мітка переходу:", String(edges.find(e => e.id === edgeId)?.label ?? "→"));
    if (label == null) return;
    setEdges((es) => es.map(e => e.id === edgeId ? { ...e, label } : e));
  };

  // Спрятать подписи рёбер, когда edgeLabelsVisible = false
  const displayEdges = useMemo<RFEdge[]>(() => {
  if (edgeLabelsVisible) return edges; // показываем всё: и подписи, и стрелки
  // когда подписи выключены — убираем и стрелки, и подписи
  return edges.map((e) => {
    const { label, markerEnd, ...rest } = e as any;
    return { ...(rest as RFEdge), label: undefined, markerEnd: undefined };
  });
}, [edges, edgeLabelsVisible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-3 md:p-6">
      <div className="mx-auto max-w-[1600px] h-full rounded-2xl overflow-hidden
        border border-black/5 dark:border-white/10
        bg-white text-slate-900 dark:bg-[#0b0e14] dark:text-zinc-200
        grid grid-rows-[56px_1fr]">
        
        {/* Header */}
        <div className="flex items-center gap-2 px-3 md:px-4
          border-b border-black/5 dark:border-white/10
          bg-white/70 dark:bg-white/5 backdrop-blur">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200">✕ Закрити</button>
          <button onClick={saveBack} className="px-3 py-1.5 rounded-lg
            bg-cyan-600 hover:bg-cyan-500 text-white
            dark:bg-cyan-600/80 dark:hover:bg-cyan-600">💾 Зберегти у застосунок</button>
          <button onClick={addNode} className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200">＋ Додати вузол</button>
          <button onClick={deleteSelection} className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200">🗑 Видалити вибране</button>
          <button onClick={downloadJSON} className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200">⬇︎ Експорт JSON</button>
          <button
            onClick={() => setShowMiniMap(v => !v)}
            className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
            title="Показати/сховати міні-мапу"
            >
            {showMiniMap ? "🗺 Приховати міні-мапу" : "🗺 Показати міні-мапу"}
          </button>
          <button
            onClick={() => setEdgeLabelsVisible(v => !v)}
            className="px-3 py-1.5 rounded-lg
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
            title="Показати/сховати підписи переходів"
            >
            {edgeLabelsVisible ? "🔤 Приховати підписи" : "🔤 Показати підписи"}
          </button>

          
          <label className="px-3 py-1.5 rounded-lg cursor-pointer
            bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
            dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200">
            ⬆︎ Імпорт JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) uploadJSON(f); }}
            />
          </label>
          <div className="ml-auto text-xs opacity-70">Режим редагування графа з міні-мапою</div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-[1fr_320px] h-full">
          {/* Canvas */}
          <div className="relative h-full bg-white dark:bg-[#0b0e14]">
            <ReactFlow
              style={{ width: "100%", height: "100%" }}    // размеры канвы
              dragHandle=".drag-handle"
              nodes={nodes.map(n => ({ ...n, data: { ...n.data }, type: "default" }))}
              edges={displayEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              fitViewOptions={{ padding: 0.4 }}
              proOptions={{ hideAttribution: true }}       // убираем подпись “React Flow”, чтобы не перекрывала
              panOnDrag
              selectionOnDrag={false}
              zoomOnScroll
              zoomOnPinch
              minZoom={0.2}
              maxZoom={2}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={{ default: RFNodeContent as any }}
              onEdgeDoubleClick={(_, edge) => editEdgeLabel(edge.id)}
              defaultEdgeOptions={{
                animated: false,
                style: { strokeWidth: 2, stroke: 'var(--rf-edge-stroke)' },
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: 'var(--rf-marker)' }
              }}
            >
              {showMiniMap && (
              <MiniMap
                className="z-[60] !pointer-events-auto"
                style={{ pointerEvents: "all", width: 200, height: 120, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}
                zoomable
                pannable
                nodeStrokeWidth={1.5}
                nodeColor={(n) => typeColors[(n.data as any)?.type as any] ?? "#6b7280"}
                nodeStrokeColor="#94a3b8"
                maskColor="rgba(2,6,23,0.75)"
                />
            )}
              
              <Controls position="bottom-left" showInteractive={false} />
              <Background variant={BackgroundVariant.Dots} gap={18} color={'var(--rf-bg-dot)'} />
            </ReactFlow>
          </div>

          {/* Side editor */}
          <div className="border-l border-black/5 dark:border-white/10
            bg-white/70 dark:bg-white/5 p-3 md:p-4 overflow-auto backdrop-blur">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Властивості вузла</div>

            {!selectedNode && (
              <div className="text-zinc-400 text-sm opacity-80">
                Оберіть вузол, щоб змінити заголовок, тип або текст. Подвійний клік по ребру — зміна підпису переходу.
              </div>
            )}

            {selectedNode && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400">id: {selectedNode.id}</div>

                <label className="block text-sm">Заголовок
                  <input
                    className="mt-1 w-full rounded-lg
                    bg-white border border-black/10 text-slate-900
                    dark:bg-zinc-900/70 dark:border-white/10 dark:text-zinc-200
                    px-3 py-2"
                    value={String(selectedNode.data?.title ?? "")}
                    onChange={(e) => updateNodeData({ title: e.target.value })}
                  />
                </label>

                <label className="block text-sm">Тип вузла
                  <select
                    className="mt-1 w-full rounded-lg
                    bg-white border border-black/10 text-slate-900
                    dark:bg-zinc-900/70 dark:border-white/10 dark:text-zinc-200
                    px-3 py-2"
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
                    className="mt-1 w-full h-48 rounded-lg
                    bg-white border border-black/10 text-slate-900
                    dark:bg-zinc-900/70 dark:border-white/10 dark:text-zinc-200
                    px-3 py-2"
                    value={String(selectedNode.data?.text ?? "")}
                    onChange={(e) => updateNodeData({ text: e.target.value })}
                  />
                </label>

                <div className="pt-2 flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg
                    bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800
                    dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200" onClick={() => setSelectedNodeId(null)}>
                    Зняти виділення
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-rose-700/80 hover:bg-rose-600" onClick={deleteSelection}>
                    Видалити вузол
                  </button>
                </div>

                <div className="pt-3 text-xs text-zinc-400">
                  Підказка: зʼєднуйте вузли перетягуванням зʼєднувачів; подвійний клік по ребру — змінити мітку.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphEditor;
