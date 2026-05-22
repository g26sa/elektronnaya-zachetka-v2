"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export type FilterSpec = {
  /** data-* атрибут, по которому фильтруем (без префикса data-). Например "course" */
  key: string;
  /** Подпись для пользователя */
  label: string;
};

/**
 * Структурные фильтры для SSR-таблицы. Каждая строка должна иметь data-{key}=value.
 * Компонент:
 *   - читает все возможные значения для каждого filter.key из DOM
 *   - рисует над таблицей dropdown'ы
 *   - при изменении скрывает строки, не совпадающие со всеми активными фильтрами
 *
 * Работает совместно с LiveTableFilter / TableSortEnhancer на той же таблице.
 */
export function TableFiltersBar({
  targetSelector,
  filters,
}: {
  targetSelector: string;
  filters: FilterSpec[];
}) {
  // value[filter.key] = выбранное значение ("" = «все»)
  const [values, setValues] = useState<Record<string, string>>({});
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>({});
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Считываем доступные значения из DOM один раз после маунта (SSR-данные стабильны)
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLTableRowElement>(targetSelector);
    const map: Record<string, Set<string>> = {};
    for (const f of filters) map[f.key] = new Set();
    for (const row of Array.from(rows)) {
      if (row.dataset.empty === "1") continue;
      for (const f of filters) {
        const v = row.dataset[f.key];
        if (v) map[f.key].add(v);
      }
    }
    const out: Record<string, string[]> = {};
    for (const f of filters) {
      const arr = Array.from(map[f.key]);
      // Числовые ключи сортируем как числа; остальные — лексикографически (с русской локалью)
      const allNumeric = arr.every((v) => /^-?\d+(?:\.\d+)?$/.test(v));
      arr.sort((a, b) =>
        allNumeric
          ? Number(a) - Number(b)
          : a.localeCompare(b, "ru", { numeric: true })
      );
      out[f.key] = arr;
    }
    setOptionsMap(out);
    setTotalCount(rows.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Применяем фильтры
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLTableRowElement>(targetSelector);
    let visible = 0;
    let total = 0;
    for (const row of Array.from(rows)) {
      if (row.dataset.empty === "1") continue;
      total++;
      let match = true;
      for (const f of filters) {
        const need = values[f.key];
        if (!need) continue;
        if (row.dataset[f.key] !== need) { match = false; break; }
      }
      row.style.display = match ? "" : "none";
      if (match) visible++;
    }
    setMatchCount(total > 0 ? visible : null);
    setTotalCount(total > 0 ? total : null);
  }, [values, filters, targetSelector]);

  const hasActive = useMemo(() => Object.values(values).some(Boolean), [values]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {filters.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</Label>
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">— все —</option>
                {(optionsMap[f.key] ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {matchCount !== null && totalCount !== null
              ? `Показано: ${matchCount} из ${totalCount}`
              : ""}
          </span>
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={() => setValues({})}>
              <X className="h-3 w-3 mr-1" />Сбросить фильтры
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
