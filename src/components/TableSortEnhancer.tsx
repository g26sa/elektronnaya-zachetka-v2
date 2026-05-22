"use client";

import { useEffect } from "react";

/**
 * Делает сортируемой любую SSR-таблицу с data-search=...
 * Кликабельны <th data-sort="text|number|date">.
 *
 * Использование на странице:
 *   <Table data-search="..."> ... <TableHead data-sort="text">ФИО</TableHead> ...
 *   <TableSortEnhancer targetSelector='table[data-search="..."]' />
 */
export function TableSortEnhancer({ targetSelector }: { targetSelector: string }) {
  useEffect(() => {
    const tables = document.querySelectorAll<HTMLTableElement>(targetSelector);
    const cleanups: Array<() => void> = [];

    for (const table of Array.from(tables)) {
      const heads = table.querySelectorAll<HTMLTableCellElement>("thead th[data-sort]");
      heads.forEach((th, colIdx) => {
        const dir: "asc" | "desc" | null = null;
        let currentDir: "asc" | "desc" | null = dir;

        th.style.cursor = "pointer";
        th.style.userSelect = "none";
        if (!th.querySelector(".sort-arrow")) {
          const arrow = document.createElement("span");
          arrow.className = "sort-arrow";
          arrow.textContent = " ↕";
          arrow.style.opacity = "0.4";
          arrow.style.fontSize = "0.85em";
          arrow.style.marginLeft = "4px";
          th.appendChild(arrow);
        }

        const onClick = () => {
          currentDir = currentDir === "asc" ? "desc" : "asc";
          // сброс стрелок у других th
          heads.forEach((other) => {
            const a = other.querySelector<HTMLSpanElement>(".sort-arrow");
            if (a) { a.textContent = " ↕"; a.style.opacity = "0.4"; }
          });
          const a = th.querySelector<HTMLSpanElement>(".sort-arrow");
          if (a) { a.textContent = currentDir === "asc" ? " ↑" : " ↓"; a.style.opacity = "1"; }

          const tbody = table.querySelector<HTMLTableSectionElement>("tbody");
          if (!tbody) return;
          const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr")).filter((r) => r.dataset.empty !== "1");

          const type = th.dataset.sort ?? "text";
          rows.sort((a, b) => {
            const av = (a.children[colIdx]?.textContent ?? "").trim();
            const bv = (b.children[colIdx]?.textContent ?? "").trim();
            let cmp = 0;
            if (type === "number") {
              cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
            } else if (type === "date") {
              // дд.мм.гггг → переворачиваем для сравнения
              const toIso = (s: string) => {
                const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
                return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
              };
              cmp = toIso(av).localeCompare(toIso(bv));
            } else {
              cmp = av.localeCompare(bv, "ru", { numeric: true });
            }
            return currentDir === "asc" ? cmp : -cmp;
          });
          rows.forEach((r) => tbody.appendChild(r));
        };

        th.addEventListener("click", onClick);
        cleanups.push(() => th.removeEventListener("click", onClick));
      });
    }

    return () => cleanups.forEach((c) => c());
  }, [targetSelector]);

  return null;
}
