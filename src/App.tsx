// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import CommentPanel from "./components/CommentPanel";

const PIN_KEY = "sg_pins"; // ключ для localStorage


/** ===== Типы данных, совместимые с вашим graph.json ===== */
type NodeType = "greeting" | "router" | "question" | "snippet";

interface Transition {
  label: string;
  to: string;
}

interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  text?: string[]; // для snippet / question / greeting
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
const TYPE_BADGE: Record<NodeType, string> = {
  greeting: "Привітання",
  router: "Router",
  question: "Question",
  snippet: "Snippet",
};

const TypePill: React.FC<{ type: NodeType }> = ({ type }) => {
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
        palette[type]
      }
    >
      {TYPE_BADGE[type]}
    </span>
  );
};

/** ===== Главный компонент ===== */
const App: React.FC = () => {
  // Язык (PL / CS / UK / DE / RO / FR)
  type Lang = "pl" | "cs" | "uk" | "de" | "ro" | "fr";
  const [lang, setLang] = useState<Lang>("pl");

  
  /** ===== Тема (светлая/тёмная) ===== */
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("sg_theme");
    return saved ? saved === "dark" : true; // по умолчанию — тёмная
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("sg_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("sg_theme", "light");
    }
  }, [darkMode]);

  /** ===== Граф ===== */
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const contentTopRef = useRef<HTMLDivElement>(null);

 // === Закреплённые узлы (pin) ===
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const togglePinned = (id: string) => {
    setPinnedIds((prev) => {
      const set = new Set(prev);
      set.has(id) ? set.delete(id) : set.add(id);
      return Array.from(set);
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(pinnedIds));
    } catch {}
  }, [pinnedIds]);

  // Загрузка графа (PL / CS)
  useEffect(() => {
    (async () => {
      try {
        const candidates = lang === "pl"
          ? ["graph.pl.json", "graph.json"]   // поддержка старого имени
          : [`graph.${lang}.json`];

        let loaded: GraphData | null = null;
        let lastErr: unknown = null;

        for (const url of candidates) {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            loaded = (await res.json()) as GraphData;
            break;
          } catch (e) {
            lastErr = e;
          }
        }

        if (!loaded) throw lastErr ?? new Error("Graph load failed");
        setGraph(loaded);


        // стартовая нода — greeting или первая
        const start =
          loaded.nodes.find((n) => n.type === "greeting")?.id || loaded.nodes[0]?.id;
        setCurrentId(start || null);
        setHistory(start ? [start] : []);
      } catch (e) {
        console.error("Не удалось загрузить граф", e);
      }
    })();
  }, [lang]);

  // Удобный доступ к ноде по id
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    graph?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph]);

  const current = currentId ? nodeMap.get(currentId) : undefined;

  // Переход по переходу
  const goTo = (nextId: string) => {
    if (!nextId || !nodeMap.has(nextId)) return;
    setCurrentId(nextId);
    setHistory((h) => [...h, nextId]);
    requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Назад по истории
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

  // Перезапуск текущего узла (прокрутка к началу)
  const restart = () => {
    if (!currentId) return;
    setCurrentId((id) => id); // принудительная перерисовка
    requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Переходы: приоритет — transitions в ноде, затем edges
  const transitions: Transition[] = useMemo(() => {
    if (!current || !graph) return [];
    if (current.transitions?.length) return current.transitions;

    const fromEdges = graph.edges?.filter((e) => e.from === current.id) || [];
    return fromEdges.map((e) => ({ label: e.label, to: e.to }));
  }, [current, graph]);

  // Фильтр списка узлов в сайдбаре
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

  const displayNodes = useMemo(() => {
    if (!graph) return [];
    const ids = new Set(pinnedIds);
    return [...filteredNodes].sort((a, b) => {
      const ap = ids.has(a.id) ? 0 : 1;
      const bp = ids.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return 0;
    });
  }, [filteredNodes, pinnedIds, graph]);


  // Комментарии всегда включены (если их не отключили вовсе) и всегда справа.
const stickyEnabled = graph?.ui?.sticky_comment_panel !== false;
const stickyRight = stickyEnabled;  // всегда справа
const stickyLeft = false;           // слева — никогда
const notesTitle = graph?.ui?.sticky_comment_title || "Коментар про клієнта";

  if (!graph || !current) {
    return (
      <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0b0e14] dark:text-zinc-200 grid place-items-center">
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400 tracking-wide">
          Завантаження…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0b0e14] dark:text-zinc-200">
      {/* === Фоновая подсветка === */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] dark:opacity-[0.07]" aria-hidden>
        <div
          className="w-full h-full"
          style={{
            background:
              "radial-gradient(1200px 600px at 110% 10%, rgba(6,182,212,0.18), transparent 60%), radial-gradient(800px 400px at -10% 90%, rgba(99,102,241,0.18), transparent 60%)",
          }}
        />
      </div>

      {/* === Хедер === */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-[#0b0e14]/60 border-b border-black/5 dark:border-white/5">
        <div className="mx-auto max-w-screen-2xl px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20 grid place-items-center">
              <span className="text-gray-900 font-black">SG</span>
            </div>
            <div>
              <div className="text-cyan-700 dark:text-cyan-300 font-semibold tracking-wide">
                Script Graph
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                sales-script-graph
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={goHome}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800 text-sm dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
              title="Домой (Greeting)"
            >
              ⌂ Домой
            </button>
            <button
              onClick={goBack}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800 text-sm dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
              title="Назад по истории"
            >
              ← Назад
            </button>
            <button
              onClick={restart}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm"
              title="Перезапустить текущий узел"
            >
              ↻ Перезапуск
            </button>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800 text-sm dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
              title="Переключить тему"
            >
              {darkMode ? "🌞 Светлая" : "🌙 Тёмная"}
            </button>
            
           {/* === Переключатель языка (select) === */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-black/10
              text-zinc-800 text-sm dark:bg-zinc-800/60 dark:hover:bg-zinc-800
              dark:border-white/10 dark:text-zinc-200"
              title="Выбрать язык"
              >
              <option value="pl">🇵🇱 Polski</option>
              <option value="cs">🇨🇿 Čeština</option>
              <option value="uk">🇺🇦 Українська</option>
              <option value="de">🇩🇪 Deutsch</option>
              <option value="ro">🇷🇴 Română</option>
              <option value="fr">🇫🇷 Français</option>
            </select>
          </div>   {/* ← закрыть ml-auto flex ... */}
        </div>   {/* ← закрыть .max-w-screen-2xl ... */}
      </header>

      {/* === Основная раскладка === */}
      <div
        className={
          stickyRight
          ? "mx-auto max-w-screen-2xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6"
          : "mx-auto max-w-screen-2xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6"
        }
        >

        {/* === Левая колонка: навигация (sidebar) === */}
        <aside className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-zinc-900/40 backdrop-blur p-3 lg:h-[calc(100dvh-120px)] lg:overflow-hidden">
          <div className="mb-2">
            <div className="px-2 text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Вузли
            </div>
            <div className="relative mt-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук…"
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-black/10 dark:border-white/10 px-10 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 ring-cyan-500/40"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                🔎
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-y-auto lg:h-[calc(100%-84px)] pr-1 space-y-1 custom-scroll">
            {displayNodes.map((n) => {
          const active = n.id === current.id;
          const pinned = pinnedIds.includes(n.id); // ← пометка: закреплён ли узел
          
          return (
            <div key={n.id} className="relative">
              <button
                onClick={() => goTo(n.id)}
                className={[
                  "w-full text-left px-3 py-2 pr-10 rounded-xl border", // pr-10 — запас справа под пин
                  active
                  ? "bg-cyan-50 border-cyan-200 ring-1 ring-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-800/40 dark:ring-cyan-700/30"
                  : "bg-white/80 border-black/5 hover:bg-white dark:bg-zinc-800/40 dark:border-white/5 dark:hover:bg-zinc-800/60",
                ].join(" ")}
                >
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {n.id}
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-zinc-800 dark:text-zinc-100">
                    {n.title}
                  </div>
                  <TypePill t={n.type} />
                </div>
              </button>

              {/* Кнопка ПИН справа */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // чтобы не срабатывал переход по узлу
                  togglePinned(n.id);
                }}
                title={pinned ? "Відкріпити" : "Закріпити"}
                className={
                  "absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded px-2 py-1 border " +
                  (pinned
                   ? "bg-amber-500/20 border-amber-400 text-amber-300"
                   : "bg-transparent border-black/10 dark:border-white/10 text-zinc-500 hover:text-zinc-300")
                }
                aria-pressed={pinned}
                >
                {pinned ? "📌" : "📍"}
              </button>
            </div>
          );
        })}
          </div>
        </aside>

        {/* === Центральная колонка: контент узла === */}
        <main>
          <div ref={contentTopRef} />
          <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-zinc-900/40 backdrop-blur p-6 relative overflow-hidden">
            {/* Подсветка под заголовком */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.12]" aria-hidden>
              <div
                className="w-full h-40"
                style={{
                  background:
                    "radial-gradient(300px 200px at 20% 10%, rgba(34,211,238,0.4), transparent 60%), radial-gradient(250px 150px at 80% 0%, rgba(139,92,246,0.4), transparent 60%)",
                }}
              />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <TypePill type={current.type} />
                <div className="text-xs text-zinc-500 dark:text-zinc-400/80">
                  id: {current.id}
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
                {current.title}
              </h1>

              {/* Текстовая часть узла */}
              {!!current.text?.length && (
                <div className="mt-5 space-y-3">
                  {current.text.map((line, i) => (
                    <p key={i} className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Кнопки переходов */}
              <div className="mt-6">
                {transitions.length > 0 ? (
                  <>
                    <div className="text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">
                      Переходи
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {transitions.map((tr, idx) => (
                        <button
                          key={idx}
                          onClick={() => goTo(tr.to)}
                          className="px-3 py-2 rounded-lg text-sm bg-zinc-100 hover:bg-zinc-200 border border-black/10 text-zinc-800 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:border-white/10 dark:text-zinc-200"
                          title={tr.to}
                        >
                          {tr.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-400 text-sm">
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
            <CommentPanel title={notesTitle} graphKey="graph" />
          </aside>
        )}
      </div>

      {/* === Футер-подсказка === */}
      <footer className="px-6 py-6 text-center text-xs text-zinc-500 dark:text-zinc-500/80">
        <span className="opacity-70">
          ↑ Використовуйте панель ліворуч для переходу між вузлами. Кнопки
          всередині вузлів відповідають вашому graph.json.
        </span>
      </footer>

      {/* Кастомный скролл */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.25);
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

export default App;
