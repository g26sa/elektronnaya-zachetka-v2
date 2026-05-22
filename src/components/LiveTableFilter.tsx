"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

/**
 * Универсальный live-фильтр строк HTML-таблицы.
 * Работает на чистом DOM: при изменении поиска прячет/показывает <tr id="...">
 * на основании их текстового содержимого. Подходит для SSR-таблиц.
 *
 * Использование:
 *   <LiveTableFilter targetSelector='table[data-search="myTable"] tbody tr' placeholder="..." />
 */
export function LiveTableFilter({
  targetSelector,
  placeholder = "Поиск…",
  className = "",
}: {
  targetSelector: string;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>(targetSelector));
    const needle = q.trim().toLowerCase();
    let visible = 0;
    for (const row of rows) {
      if (row.dataset.empty === "1") continue;
      const txt = (row.textContent ?? "").toLowerCase();
      const show = needle === "" || txt.includes(needle);
      row.style.display = show ? "" : "none";
      if (show) visible++;
    }
    setMatchCount(rows.length > 0 ? visible : null);
  }, [q, targetSelector]);

  return (
    <div className={"space-y-1 " + className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Очистить"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {q && matchCount !== null && (
        <p className="text-xs text-muted-foreground">Найдено строк: {matchCount}</p>
      )}
    </div>
  );
}
