"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const GRADE_OPTIONS = ["5", "4", "3", "2", "нет оценки"];

export function PlanAssessmentsFilters({ targetSelector }: { targetSelector: string }) {
  const [grade, setGrade] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [counts, setCounts] = useState<{ shown: number; total: number } | null>(null);

  const apply = useCallback(() => {
    const rows = document.querySelectorAll<HTMLTableRowElement>(targetSelector);
    let shown = 0;
    let total = 0;
    for (const row of Array.from(rows)) {
      if (row.dataset.empty === "1") continue;
      total++;
      let match = true;
      if (grade) {
        if (row.dataset.grade !== grade) match = false;
      }
      if (match && dateFrom) {
        const d = row.dataset.date ?? "";
        if (!d || d < dateFrom) match = false;
      }
      if (match && dateTo) {
        const d = row.dataset.date ?? "";
        if (!d || d > dateTo) match = false;
      }
      row.style.display = match ? "" : "none";
      if (match) shown++;
    }
    setCounts(total > 0 ? { shown, total } : null);
  }, [targetSelector, grade, dateFrom, dateTo]);

  useEffect(() => { apply(); }, [apply]);

  const hasActive = grade || dateFrom || dateTo;
  const reset = () => { setGrade(""); setDateFrom(""); setDateTo(""); };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Оценка</Label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— все —</option>
              {GRADE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Дата с</Label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Дата по</Label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {counts ? `Показано: ${counts.shown} из ${counts.total}` : ""}
          </span>
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-3 w-3 mr-1" />Сбросить фильтры
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
