import { useEffect, useMemo, useState } from 'react'

type NodeOption = { label: string; to?: string }
type NodeT = {
  id: string
  title: string
  type: string
  text?: string[]
  options?: NodeOption[]
}
type EdgeT = { from: string; to: string; label: string }
type GraphT = { nodes: NodeT[]; edges: EdgeT[] }

// --- Error Boundary, чтобы не было «белого экрана» ---
function ErrorBoundary(props: { children: React.ReactNode }) {
  const [err, setErr] = useState<Error | null>(null)
  if (err) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-300 p-6">
        <h1 className="text-xl font-bold mb-2">Помилка у рендері</h1>
        <p className="mb-4">{err.message}</p>
        <p className="text-sm text-slate-400">
          Відкрий консоль (F12) → Console, щоб побачити стек.
        </p>
      </div>
    )
  }
  return (
    <BoundaryImpl onError={setErr}>{props.children}</BoundaryImpl>
  )
}

function BoundaryImpl({
  children,
  onError,
}: {
  children: React.ReactNode
  onError: (e: Error) => void
}) {
  try {
    return <>{children}</>
  } catch (e: any) {
    onError(e)
    return null
  }
}

// --- безопасный нормалайзер без Unicode property escapes ---
const normalize = (s: string) =>
  (s || '')
    .normalize('NFKD')                       // убрать диакритику
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '')             // только буквы/цифры латиницы
    .replace(/:$/,'')

export default function App() {
  const [graph, setGraph] = useState<GraphT | null>(null)
  const [currentId, setCurrentId] = useState<string>()
  const [comment, setComment] = useState<string>(localStorage.getItem('client_comment') ?? '')
  const [showNumbers, setShowNumbers] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')

  // загрузка графа
  useEffect(() => {
    (async () => {
      const res = await fetch(import.meta.env.BASE_URL + 'graph.json')
      if (!res.ok) throw new Error('Не вдалося завантажити graph.json')
      const data: GraphT = await res.json()
      if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
        throw new Error('Невірний формат graph.json')
      }
      setGraph(data)
      setCurrentId(data.nodes[0]?.id)
    })().catch((e) => {
      console.error(e)
      // покажем понятную ошибку
      alert('Помилка завантаження: ' + (e?.message || e))
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('client_comment', comment)
  }, [comment])

  const goToOption = (label: string, to?: string) => {
    if (!graph) return
    // 1) по id
    if (to) {
      const byId = graph.nodes.find((n) => n.id === to)
      if (byId) { setCurrentId(byId.id); return }
    }
    // 2) по title (label≈title)
    const byTitle = graph.nodes.find((n) => normalize(n.title).startsWith(normalize(label)))
    if (byTitle) { setCurrentId(byTitle.id); return }
    console.warn('Не знайшов ціль для опції:', label, to)
  }

  if (!graph || !currentId) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        Завантаження…
      </div>
    )
  }

  const node = graph.nodes.find((n) => n.id === currentId)
  if (!node) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-red-300 flex items-center justify-center p-6 text-center">
        Не знайдено вузол з id: <span className="font-mono ml-1">{currentId}</span>
      </div>
    )
  }

  const nodeOptions: NodeOption[] = Array.isArray(node.options) ? node.options : []
  const edges: EdgeT[] = useMemo(() => {
    if (nodeOptions.length) return []
    const out = (graph.edges || []).filter((e) => e.from === currentId)
    // убрать дубли по label+to
    const uniq = new Map<string, EdgeT>()
    for (const e of out) uniq.set(`${e.label}>${e.to}`, e)
    return Array.from(uniq.values())
  }, [graph.edges, currentId, nodeOptions.length])

  // фильтр списка узлов слева
  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return graph.nodes
    return graph.nodes.filter((n) =>
      n.title.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q) ||
      (n.text ?? []).some((t) => t.toLowerCase().includes(q))
    )
  }, [graph.nodes, search])

  return (
    <ErrorBoundary>
      <div className="min-h-screen grid grid-rows-[auto_auto_1fr] bg-slate-950 text-slate-200">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-3 py-2">
          <div className="font-semibold tracking-wide">Sales Script — Graph</div>
          <div className="ml-auto flex items-center gap-4 text-sm">
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

        {/* Top nav row: options (если router) ИЛИ edges */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
          {nodeOptions.length > 0 ? (
            nodeOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => goToOption(opt.label, opt.to)}
                className="rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700/70 px-3 py-1.5 text-sm transition"
                title={opt.to ? `→ ${opt.to}` : ''}
              >
                {opt.label}
              </button>
            ))
          ) : edges.length > 0 ? (
            edges.map((e, i) => (
              <button
                key={`${e.label}-${e.to}-${i}`}
                onClick={() => setCurrentId(e.to)}
                className="rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700/70 px-3 py-1.5 text-sm transition"
              >
                {e.label}
              </button>
            ))
          ) : (
            <div className="text-xs text-slate-400">Немає вихідних переходів для цього вузла</div>
          )}
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-[280px_1fr_360px] gap-3 p-3">
          {/* Left sidebar */}
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
              const active = n.id === currentId
              return (
                <button
                  key={n.id}
                  onClick={() => setCurrentId(n.id)}
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

          {/* Center content */}
          <main className="overflow-auto">
            <div className="text-xs uppercase tracking-wide text-slate-400">{node.type}</div>
            <h1 className="mt-1 mb-3 text-xl font-semibold text-slate-100">{node.title}</h1>

            {(node.text ?? [])
              .filter((t) => (t ?? '').trim() !== '')
              .map((t, i) => (
                <div
                  key={i}
                  className="group relative mb-2 rounded-2xl border border-slate-800 bg-slate-900 p-3"
                >
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

          {/* Right sidebar: comments */}
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
    </ErrorBoundary>
  )
}
