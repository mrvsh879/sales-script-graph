// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ===== Типы данных (совместимы с вашим graph.json) ===== */
type NodeType = "greeting" | "router" | "question" | "snippet";

interface Transition {
  label: string;
  to: string;
}

interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  text?: string[];          // для snippet / question / greeting
  options?: { label: string; to: string }[]; // историческое поле
  transitions?: Transition[]; // предпочтительный источник кнопок
}

interface Edge {
  from: string;
  to: string;
  label: string;
}

interface GraphUI {
  sticky_comment_panel?: boolean;
  sticky_comment_title?: string;
  sticky_comment_position?: "left" | "right";
}

interface GraphData {
  nodes: GraphNode[];
  edges?: Edge[];
  ui?: GraphUI;
}

/** ===== Вспомогательные утилиты ===== */
const typeBadge = (t: NodeType) => {
  switch (t) {
    case "greeting":
      return "Привітання";
    case "router":
      return "Router";
    case "question":
      return "Question";
    case "snippet":
      return "Snippet";
    default:
      return t;
  }
};

const TypePill: React.FC<{ t: NodeType }> = ({ t }) => {
  const palette: Record<NodeType, string> = {
    greeting:
      "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-700/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]",
    router:
      "bg-cyan-900/40 text-cyan-300 ring-1 ring-cyan-700/40 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]",
    question:
      "bg-violet-900/40 text-violet-300 ring-1 ring-violet-700/40 shadow-[inset_0_0_20px_rgba(139,92,246,0.2)]",
    snippet:
      "bg-sky-900/40 text-sky-300 ring-1 ring-sky-700/40 shadow-[inset_0_0_20px_rgba(56,189,248,0.2)]",
  };
  return (
    <span
      className={
        "px-3 py-1 rounded-full text-xs font-semibold tracking-wide " +
        palette[t]
      }
    >
      {typeBadge(t)}
    </span>
  );
};

/** ===== Главный компонент ===== */
const App: React.FC = () => {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [comment, setComment] = useState("");
  const contentTopRef = useRef<HTMLDivElement>(null);

  // Загрузка graph.json
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("graph.json", { cache: "no-store" });
        const data = (await res.json()) as GraphData;
        setGraph(data);

        // стартовая нода — greeting или первая
        const start =
          data.nodes.find((n) => n.type === "greeting")?.id || data.nodes[0]?.id;
        setCurrentId(start || null);
        setHistory(start ? [start] : []);
      } catch (e) {
        console.error("Не удалось загрузить graph.json", e);
      }
    })();
  }, []);

  // удобный доступ к ноде по id
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    graph?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph]);

  const current = currentId ? nodeMap.get(currentId) : undefined;

  // переход по переходу
  const goTo = (nextId: string) => {
    if (!nextId || !nodeMap.has(nextId)) return;
    setCurrentId(nextId);
    setHistory((h) => [...h, nextId]);
    // плавный скролл вверх контентной части
    requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // назад по истории
  const goBack = () => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const prev = h[h.length - 2];
      setCurrentId(prev);
      return h.slice(0, -1);
    });
  };

  // Домой (к greeting)
  const goHome = () => {
    if (!graph) return;
    const start =
      graph.nodes.find((n) => n.type === "greeting")?.id || graph.nodes[0]?.id;
    if (start) {
      setCurrentId(start);
      setHistory([start]);
    }
  };

  // из узла берём transitions — либо свои, либо из edges
  const transitions: Transition[] = useMemo(() => {
    if (!current || !graph) return [];
    if (current.transitions?.length) return current.transitions;

    // fallback: из edges
    const fromEdges =
      graph.edges?.filter((e) => e.from === current.id) || [];
    return fromEdges.map((e) => ({ label: e.label, to: e.to }));
  }, [current, graph]);

  // фильтр списка узлов в сайдбаре
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    const s = search.trim().toLowerCase();
    if (!s) return graph.nodes;
    return graph.nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(s) ||
        n.id.toLowerCase().includes(s) ||
        (n.text || []).some((t) => t.toLowerCase().includes(s))
    );
  }, [graph, search]);

  const stickyRight =
    graph?.ui?.sticky_comment_panel &&
    (graph?.ui?.sticky_comment_position ?? "right") === "right";
  const stickyLeft =
    graph?.ui?.sticky_comment_panel &&
    (graph?.ui?.sticky_comment_position ?? "right") === "left";

  if (!graph || !current) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-zinc-200 grid place-items-center">
        <div className="animate-pulse text-zinc-400 tracking-wide">
          Завантаження…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-200">
      {/* === Градиентная сетка в фоне + подсветка === */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.07]" aria-hidden>
        <div
          className="w-full h-full"
          style={{
            background:
              "radial-gradient(1200px 600px at 110% 10%, rgba(6,182,212,0.18), transparent 60%), radial-gradient(800px 400px at -10% 90%, rgba(99,102,241,0.18), transparent 60%)",
          }}
        />
      </div>

      {/* === Хедер === */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0b0e14]/60 border-b border-white/5">
        <div className="mx-auto max-w-screen-2xl px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20 grid place-items-center">
              <span className="text-gray-900 font-black">SG</span>
            </div>
            <div>
              <div className="text-cyan-300 font-semibold tracking-wide">
                Script Graph
              </div>
              <div className="text-xs text-zinc-400">
                sales-script-graph / GitHub Pages
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={goHome}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-sm"
              title="Домой (Greeting)"
            >
              ⌂ Домой
            </button>
            <button
              onClick={goBack}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-sm"
              title="Назад по истории"
            >
              ← Назад
            </button>
            <button
              onClick={() => goTo(history[history.length - 1])}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm"
              title="Перезапустить текущий узел"
            >
              ↻ Перезапуск
            </button>
          </div>
        </div>
      </header>

      {/* === Основная трех-колоночная раскладка === */}
      <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* ==== Левая заметка (если ui требует left) ==== */}
        {stickyLeft && (
          <aside className="hidden lg:block">
            <StickyNotes
              title={graph.ui?.sticky_comment_title || "Коментар"}
              value={comment}
              onChange={setComment}
            />
          </aside>
        )}

        {/* === Левая колонка: навигация (sidebar) === */}
        <aside className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur p-3 lg:h-[calc(100dvh-120px)] lg:overflow-hidden">
          <div className="mb-2">
            <div className="px-2 text-[11px] uppercase tracking-widest text-zinc-400">
              Вузли
            </div>
            <div className="relative mt-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук…"
                className="w-full rounded-xl bg-zinc-800/60 border border-white/10 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 ring-cyan-500/40"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                🔎
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-y-auto lg:h-[calc(100%-84px)] pr-1 space-y-1 custom-scroll">
            {filteredNodes.map((n) => {
              const active = n.id === current.id;
              return (
                <button
                  key={n.id}
                  onClick={() => goTo(n.id)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl border",
                    active
                      ? "bg-cyan-950/40 border-cyan-800/40 ring-1 ring-cyan-700/30"
                      : "bg-zinc-800/40 border-white/5 hover:bg-zinc-800/60",
                  ].join(" ")}
                >
                  <div className="text-[11px] text-zinc-400">{n.id}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-zinc-100">
                      {n.title}
                    </div>
                    <TypePill t={n.type} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* === Центральная колонка: контент узла === */}
        <main>
          <div ref={contentTopRef} />
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur p-6 relative overflow-hidden">
            {/* подсветка под заголовком */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden>
              <div
                className="w-full h-40"
                style={{
                  background:
                    "radial-gradient(300px 200px at 20% 10%, rgba(34,211,238,0.6), transparent 60%), radial-gradient(250px 150px at 80% 0%, rgba(139,92,246,0.6), transparent 60%)",
                }}
              />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <TypePill t={current.type} />
                <div className="text-xs text-zinc-400/80">id: {current.id}</div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                {current.title}
              </h1>

              {/* Текстовая часть узла */}
              {!!current.text?.length && (
                <div className="mt-5 space-y-3">
                  {current.text.map((line, i) => (
                    <p key={i} className="text-zinc-300 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Кнопки переходов */}
              <div className="mt-6">
                {transitions.length > 0 ? (
                  <>
                    <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">
                      Переходи
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {transitions.map((tr, idx) => (
                        <button
                          key={idx}
                          onClick={() => goTo(tr.to)}
                          className="px-3 py-2 rounded-lg text-sm bg-zinc-800/60 hover:bg-zinc-800 border border-white/10 text-zinc-200"
                          title={tr.to}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-400 text-sm">
                    Для цього вузла переходів не знайдено.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ==== Правая заметка (если ui требует right) ==== */}
        {stickyRight && (
          <aside className="hidden lg:block">
            <StickyNotes
              title={graph.ui?.sticky_comment_title || "Коментар"}
              value={comment}
              onChange={setComment}
            />
          </aside>
        )}
      </div>

      {/* === Низ страницы (подсказки) === */}
      <footer className="px-6 py-6 text-center text-xs text-zinc-500">
        <span className="opacity-70">
          ↑ Використовуйте панель ліворуч для переходу між вузлами. Кнопки
          всередині вузлів відповідають вашому graph.json.
        </span>
      </footer>

      {/* стилизация кастомного скролла немного футуристичная */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.15);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

/** ===== Компонент «липкие заметки» ===== */
const StickyNotes: React.FC<{
  title: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ title, value, onChange }) => {
  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur p-4 sticky top-[88px]">
      <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">
        {title}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ваші нотатки…"
        className="w-full h-[260px] rounded-xl bg-zinc-800/60 border border-white/10 p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 ring-cyan-500/40 resize-none"
      />
      <div className="mt-2 text-[11px] text-zinc-500">Зберігається локально*</div>
    </div>
  );
};

export default App;
