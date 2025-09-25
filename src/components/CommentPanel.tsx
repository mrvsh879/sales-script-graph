import React from "react";

type Props = {
  title: string;
  /** Ключ для локального сохранения комментария (обычно "graph") */
  graphKey: string;
};

/**
 * Панель комментариев, полностью адаптированная под светлую/тёмную темы.
 * Основано на классе `dark` у <html> (Tailwind dark variant).
 */
const CommentPanel: React.FC<Props> = ({ title, graphKey }) => {
  const storageKey = `notes:${graphKey}`;

  const [value, setValue] = React.useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* ignore */
    }
  }, [value, storageKey]);

  return (
    <aside className="hidden lg:block sticky top-[88px]">
      {/* Корпус панели */}
      <div
        className={[
          // Светлая тема
          "rounded-2xl overflow-hidden border bg-white text-zinc-800 shadow-sm",
          "border-zinc-200",
          // Тёмная тема
          "dark:bg-zinc-900/40 dark:text-zinc-200 dark:border-white/10",
          "backdrop-blur",
        ].join(" ")}
      >
        {/* Заголовок */}
        <div
          className={[
            "px-4 py-2 text-[11px] uppercase tracking-widest",
            // Светлая
            "bg-zinc-100/70 text-zinc-600 border-b border-zinc-200",
            // Тёмная
            "dark:bg-white/5 dark:text-zinc-400 dark:border-white/10",
          ].join(" ")}
        >
          {title}
        </div>

        {/* Контент */}
        <div className="p-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ваші нотатки…"
            className={[
              "w-full h-[65vh] resize-none rounded-xl p-3 text-sm focus:outline-none focus:ring-2 ring-cyan-500/40",
              // Светлая
              "bg-zinc-100 border border-zinc-300 text-zinc-900 placeholder-zinc-400",
              // Тёмная
              "dark:bg-zinc-800/60 dark:border-white/10 dark:text-zinc-100 dark:placeholder-zinc-500",
            ].join(" ")}
          />
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Зберігається локально*
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CommentPanel;
