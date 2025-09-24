// src/components/Sidebar.tsx
import React from "react";

type SidebarProps = {
  nodes: { id: string; title: string; type: string }[];
  currentId: string | null;
  onSelect: (id: string) => void;
};

export default function Sidebar({ nodes, currentId, onSelect }: SidebarProps) {
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return nodes;
    return nodes.filter(
      (n) =>
        n.id.toLowerCase().includes(s) ||
        n.title.toLowerCase().includes(s) ||
        n.type.toLowerCase().includes(s)
    );
  }, [q, nodes]);

  return (
    <aside className="h-full w-full overflow-hidden border-r border-white/10 bg-slate-900/60 backdrop-blur">
      <div className="p-3 border-b border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук…"
          className="w-full rounded-md bg-slate-800/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-cyan-400"
        />
      </div>

      <div className="h-[calc(100%-3rem)] overflow-y-auto p-2 space-y-1">
        {filtered.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`w-full text-left rounded-lg px-3 py-2 text-sm transition
            ${currentId === n.id
                ? "bg-cyan-600/20 ring-1 ring-cyan-400 text-white"
                : "hover:bg-white/5 text-slate-200"}`}
            title={n.id}
          >
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              {n.type}
            </div>
            <div className="truncate">{n.title || n.id}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
