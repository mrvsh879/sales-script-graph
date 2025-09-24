// src/components/Sidebar.tsx
import React from "react";

export type Node = {
  id: string;
  title: string;
  type: string;
  text?: string[];
};

type Props = {
  nodes: Node[];
  currentId: string | null;
  onSelect: (id: string) => void;
};

export default function Sidebar({ nodes, currentId, onSelect }: Props) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return nodes;
    return nodes.filter(
      (n) =>
        n.id.toLowerCase().includes(s) ||
        n.title.toLowerCase().includes(s) ||
        (n.text || []).some((t) => t.toLowerCase().includes(s))
    );
  }, [q, nodes]);

  return (
    <aside className="h-full border-r border-white/10 bg-slate-950/40 backdrop-blur">
      <div className="p-3 border-b border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук…"
          className="w-full rounded-md bg-slate-900/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-cyan-400"
        />
      </div>

      <div className="h-[calc(100%-3rem)] overflow-y-auto p-2 space-y-1">
        {filtered.map((n) => {
          const active = n.id === currentId;
          return (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={[
                "w-full text-left px-3 py-2 rounded-md border",
                active
                  ? "bg-cyan-900/30 border-cyan-700/40 ring-1 ring-cyan-600/30"
                  : "bg-slate-900/50 border-white/10 hover:bg-slate-900/70",
              ].join(" ")}
              title={n.id}
            >
              <div className="text-[11px] text-slate-400">{n.id}</div>
              <div className="text-slate-100 font-medium">{n.title}</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
