import { useEffect, useState } from 'react'

type NodeT = { id: string; title: string; type: string; text: string[] }
type EdgeT = { from: string; to: string; label: string }
type GraphT = { nodes: NodeT[]; edges: EdgeT[] }

export default function App() {
  const [g, setG] = useState<GraphT | null>(null)
  const [curr, setCurr] = useState<string | undefined>(undefined)
  const [comment, setComment] = useState<string>(
    localStorage.getItem('client_comment') ?? ''
  )
  const [showNumbers, setShowNumbers] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const res = await fetch(import.meta.env.BASE_URL + 'graph.json')
      const data: GraphT = await res.json()
      setG(data)
      setCurr(data.nodes[0]?.id)
    })()
  }, [])

  useEffect(() => {
    localStorage.setItem('client_comment', comment)
  }, [comment])

  if (!g || !curr) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        Завантаження…
      </div>
    )
  }

  const node = g.nodes.find((n) => n.id === curr)!
  const edges = g.edges.filter((e) => e.from === curr)

  // фильтр списка узлов по поиску
  const filteredNodes = g.nodes.filter((n) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      n.title.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q) ||
      (n.text || []).some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen grid grid-rows-[auto_auto_1fr] bg-slate-950 text-slate-200">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-3 py-2">
        <div className="font-semibold tracking-wide">Sales Script — Graph</div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-500"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
            />
            <span className="select-none">Нумерація</span>
          </label>
        </div>
      </header>

      {/* Edge buttons row */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
        {edges.length === 0 ? (
          <div className="text-xs text-slate-400">
            Немає вихідних переходів для цього вузла
          </div>
        ) : (
          edges.map((e, i) => (
            <button
              key={i}
              onClick={() => setCurr(e.to)}
              className="rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700/70 px-3 py-1.5 text-sm transition"
            >
              {e.label}
            </button>
          ))
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-[280px_1fr_360px] gap-3 p-3">
        {/* Left sidebar: nodes */}
        <aside className="flex flex-col gap-2 overflow-auto pr-1">
          <div className="sticky top-0 z-10 bg-slate-950 pb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук вузлів/текстів…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {filteredNodes.map((n) => {
            const active = n.id === curr
            return (
              <button
                key={n.id}
                onClick={() => setCurr(n.id)}
                className={[
                  'w-full text-left rounded-xl border px-3 py-2 transition',
                  active
                    ? 'border-indigo-500/60 bg-indigo-500/10 shadow-inner'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800/70',
                ].join(' ')}
              >
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-[11px] text-slate-400">{n.type}</div>
              </button>
            )
          })}
        </aside>

        {/* Center: node content */}
        <main className="overflow-auto">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {node.type}
          </div>
          <h1 className="mt-1 mb-3 text-xl font-semibold text-slate-100">
            {node.title}
          </h1>

          {(node.text ?? [])
            .filter((t) => (t ?? '').trim() !== '')
            .map((t, i) => (
              <div
                key={i}
                className="group relative mb-2 rounded-2xl border border-slate-800 bg-slate-900 p-3"
              >
                {/* Номер строки — показываем только если включен переключатель */}
                {showNumbers && (
                  <div className="absolute left-2 top-2 select-none rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {i + 1}
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed pr-28">
                  {t}
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(t)}
                  className="absolute right-2 top-2 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs opacity-70 transition hover:opacity-100"
                >
                  Копіювати
                </button>
              </div>
            ))}
        </main>

        {/* Right sidebar: client comment */}
        <aside className="flex min-h-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-sm">Коментар про клієнта</div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Нотатки…"
            className="min-h-0 flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-[11px] text-slate-500">Зберігається локально</div>
        </aside>
      </div>
    </div>
  )
}
