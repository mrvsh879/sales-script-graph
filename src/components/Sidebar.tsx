import React from "react";

type NodeType = "greeting" | "router" | "question" | "snippet";

export type SidebarNode = {
  id: string;
  title: string;
  type: NodeType;
};

type Props = {
  nodes: SidebarNode[];
  currentId: string | null;
  onSelect: (id: string) => void;
  /** опционально — уникальный суффикс для хранения */
  storageKeySuffix?: string;
};

const PIN_KEY = "pinned:nodes";

function usePinned(storageKeySuffix?: string) {
  const key = storageKeySuffix ? `${PIN_KEY}:${storageKeySuffix}` : PIN_KEY;

  const [pinned, setPinned] = React.useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(pinned)));
    } catch {}
  }, [key, pinned]);

  const toggle = React.useCallback((id: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isPinned = React.useCallback((id: string) => pinned.has(id), [pinned]);

  return { pinned, toggle, isPinned };
}

const TypePill: React.FC<{ t: NodeType }> = ({ t }) => {
  const palette: Record<NodeType, string> = {
    greeting: "bg-emerald-900/30 text-emerald-300 ring-1 ring-emerald-800/40",
    router:   "bg-cyan-900/30 text-cyan-300 ring-1 ring-cyan-800/40",
    question: "bg-violet-900/30 text-violet-300 ring-1 ring-violet-800/40",
    snippet:  "bg-sky-900/30 text-sky-300 ring-1 ring-sky-800/40",
  };
  return (
    <span className={"px-2 py-[2px] rounded-full text-[10px] font-semibold " + palette[t]}>
      {t}
    </span>
  );
};

const Sidebar: React.FC<Props> = ({ nodes, currentId, onSelect, storageKeySuffix }) => {
  const [q, setQ] = React.useState("");
  const { pinned, isPinned, toggle } = usePinned(storageKeySuffix);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return nodes;
    return nodes.filter(
      n =>
        n.title.toLowerCase().includes(s) ||
        n.id.toLowerCase().includes(s) ||
        n.type.toLowerCase().includes(s)
    );
  }, [nodes, q]);

  const pinnedNodes = filtered.filter(n => isPinned(n.id));
  const otherNodes  = filtered.filter(n => !isPinned(n.id));

  const NodeRow: React.FC<{ n: SidebarNode }> = ({ n }) => {
    const active = n.id === currentId;
    const pinnedHere = isPinned(n.id);

    return (
      <div
        className={
          "w-full rounded-xl border mb-2 " +
          (active
            ? "bg-cyan-950/30 border-cyan-800/30 ring-1 ring-cyan-700/30"
            : "bg-zinc-800/40 border-white/5 hover:bg-zinc-800/60")
        }
      >
        <button onClick={() => onSelect(n.id)} className="w-full text-left px-3 pt-2 pb-1">
          <div className="text-[11px] text-zinc-400">{n.id}</div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-zinc-100">{n.title}</div>
            <TypePill t={n.type} />
            {/* ПИН СПРАВА — ВСЕГДА ВИДЕН */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(n.id);
              }}
              aria-label={pinnedHere ? "Отменить закрепление" : "Закрепить узел"}
              title={pinnedHere ? "Отменить закрепление" : "Закрепить узел"}
              className={
                "ml-auto shrink-0 rounded-md px-2 py-[2px] text-xs border " +
                (pinnedHere
                  ? "bg-amber-500/20 text-amber-300 border-amber-600/40"
                  : "bg-zinc-700/40 text-zinc-300 border-white/10 hover:bg-zinc-700/60")
              }
            >
              {pinnedHere ? "📌" : "📍"}
            </button>
          </div>
        </button>
      </div>
    );
  };

  return (
    <aside className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur p-3 lg:h-[calc(100dvh-120px)] lg:overflow-hidden">
      {/* поиск */}
      <div className="mb-3">
        <div className="px-2 text-[11px] uppercase tracking-widest text-zinc-400">Вузли</div>
        <div className="relative mt-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук…"
            className="w-full rounded-xl bg-zinc-800/60 border border-white/10 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 ring-cyan-500/40"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔎</div>
        </div>
      </div>

      <div className="overflow-y-auto lg:h-[calc(100%-84px)] pr-1 custom-scroll">
        {pinnedNodes.length > 0 && (
          <>
            <div className="px-1 mb-1 text-[11px] uppercase tracking-widest text-amber-300">
              Закріплені
            </div>
            {pinnedNodes.map(n => <NodeRow key={`p:${n.id}`} n={n} />)}
            <div className="my-2 h-px bg-white/10" />
          </>
        )}

        <div className="px-1 mb-1 text-[11px] uppercase tracking-widest text-zinc-400">Всі вузли</div>
        {otherNodes.map(n => <NodeRow key={`o:${n.id}`} n={n} />)}
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.15);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
