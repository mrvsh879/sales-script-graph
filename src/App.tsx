import React, { useEffect, useMemo, useState } from 'react'

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

// Классический ErrorBoundary, чтобы вместо белого экрана был текст ошибки
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { error }
  }
  componentDidCatch(error: any, info: any) {
    // Можно отправить лог на сервер; здесь просто в консоль
    console.error('UI Error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
          <h1 className="text-xl font-semibold text-red-400">Сталася помилка в інтерфейсі</h1>
          <pre className="mt-4 whitespace-pre-wrap text-xs opacity-80">
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }
    return <>{this.props.children}</>
  }
}

export default function App() {
  // ---------------- state ----------------
  const [graph, setGraph] = useState<GraphT | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [comment, setComment] = useState<string>(() => {
    try {
      return localStorage.getItem('pl-comment') ?? ''
    } catch {
      return ''
    }
  })

  // сохраняем коммент локально
  useEffect(() => {
    try {
      localStorage.setItem('pl-comment', comment)
    } catch {}
  }, [comment])

  // загружаем граф (файл кладётся В vite в /public, на Pages путь = BASE_URL + graph.json)
  useEffect(() => {
    const url = (import.meta as any).env.BASE_URL + 'graph.json'
    fetch(url)
      .then((r) => r.json())
      .then((data: GraphT) => {
        setGraph(data)
        if (data?.nodes?.length && !currentId) setCurrentId(data.nodes[0].id)
      })
      .catch((e) => {
        console.error('Не вдалося завантажити graph.json:', e)
      })
  }, [])

  // ---------------- selectors (хуки ВСЕГДА наверху) ----------------
  const node = useMemo<NodeT | null>(() => {
    if (!graph || !currentId) return null
    return graph.nodes.find((n) => n.id === currentId) ?? null
  }, [graph, currentId])

  const nodeOptions: NodeOption[] = useMemo(
    () => (Array.isArray(node?.options) ? (node!.options as NodeOption[]) : []),
    [node]
  )

  const edges = useMemo<EdgeT[]>(() => {
    if (!graph || !currentId || nodeOptions.length) return []
    const list = (graph.edges ?? []).filter((e) => e.from === currentId)
    // уникализируем по (label,to)
    const key = (e: EdgeT) => `${e.label}>${e.to}`
    const map = new Map<string, EdgeT>()
    list.forEach((e) => map.set(key(e), e))
    return Array.from(map.values())
  }, [graph, currentId, nodeOptions.length])

  const filteredNodes = useMemo(() => {
    const list = graph?.nodes ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.text ?? []).some((t) => t.toLowerCase().includes(q))
    )
  }, [graph, search])

  // ---------------- render ----------------
  if (!graph || !currentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Завантаження…
      </div>
    )
  }

  if (!node) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-300">
        Не знайдено вузол з id: <span className="font-mono ml-2">{currentId}</span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-slate-950 text-slate-200 flex">
        {/* Sidebar */}
        <aside className="w-[320px] border-r border-white/10 p-4 flex flex-col gap-3">
          <div className="text-sm opacity-70">Вузли</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук…"
            className="w-full rounded-lg bg-slate-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <div className="min-h-0 flex-1 overflow-auto space-y-1">
            {filteredNodes.map((n) => (
              <button
                key={n.id}
                onClick={() => setCurrentId(n.id)}
                className={`block w-full text-left rounded-lg px-3 py-2 hover:bg-white/5 ${
                  n.id === currentId ? 'bg-indigo-600/20 ring-1 ring-indigo-500' : ''
                }`}
              >
                <div className="text-[11px] uppercase opacity-60">{n.type}</div>
                <div className="text-sm font-medium">{n.title}</div>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-sm opacity-70 mb-1">Коментар</div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ваші нотатки…"
              className="w-full min-h-[80px] rounded-lg bg-slate-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
            />
            <div className="text-[11px] opacity-50 mt-1">Зберігається локально</div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <header className="border-b border-white/10 pb-4">
              <div className="text-xs uppercase opacity-60">{node.type}</div>
              <h1 className="text-2xl font-semibold">{node.title}</h1>
            </header>

            {!!(node.text && node.text.length) && (
              <section className="space-y-3 leading-relaxed">
                {node.text!.map((p, i) => (
                  <p key={i} className="text-slate-300">
                    {p}
                  </p>
                ))}
              </section>
            )}

            {nodeOptions.length > 0 && (
              <section className="space-y-2">
                <div className="text-sm opacity-70">Варіанти</div>
                <div className="flex flex-wrap gap-2">
                  {nodeOptions.map((op, i) => (
                    <button
                      key={i}
                      onClick={() => op.to && setCurrentId(op.to)}
                      className="rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 px-3 py-2 ring-1 ring-indigo-500 text-sm"
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {edges.length > 0 && (
              <section className="space-y-2">
                <div className="text-sm opacity-70">Переходи</div>
                <div className="flex flex-wrap gap-2">
                  {edges.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentId(e.to)}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 ring-1 ring-white/10 text-sm"
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
