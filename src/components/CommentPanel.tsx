// src/components/CommentPanel.tsx
import React from "react";

type CommentPanelProps = {
  title?: string;
  graphKey?: string; // например, имя файла graph.json
};

export default function CommentPanel({
  title = "Коментар про клієнта",
  graphKey = "default",
}: CommentPanelProps) {
  const storageKey = `sg:notes:${graphKey}`;
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    // подхватываем сохраненные заметки
    const saved = localStorage.getItem(storageKey);
    if (saved != null) setValue(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  React.useEffect(() => {
    localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return (
    <aside className="h-full w-full overflow-hidden border-l border-white/10 bg-slate-900/60 backdrop-blur">
      <div className="p-3 border-b border-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {title}
        </div>
      </div>

      <div className="p-3 h-[calc(100%-3rem)]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ваші нотатки…"
          className="h-full w-full resize-none rounded-md bg-slate-800/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-cyan-400"
        />
        <div className="mt-2 text-[10px] text-slate-400">
          Зберігається локально*
        </div>
      </div>
    </aside>
  );
}
