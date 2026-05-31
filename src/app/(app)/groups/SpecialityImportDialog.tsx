"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, CheckCircle2, XCircle } from "lucide-react";

interface ImportResult {
  created: number;
  skipped: number;
  total: number;
  names: string[];
}

export function SpecialityImportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Выберите файл"); return; }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import-specialities", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ошибка импорта");
      } else {
        setResult(data as ImportResult);
      }
    } catch {
      setError("Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Импорт специальностей
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт специальностей</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Загрузите файл Excel (.xlsx / .xls / .xlsm). Специальности укажите в столбце A,
              начиная с ячейки A1 — по одной в каждой строке.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer cursor-pointer"
            />

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Загрузка…" : "Импортировать"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-muted-foreground mt-1">Добавлено</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">Уже были</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground mt-1">В файле</p>
              </div>
            </div>

            {result.names.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Специальности
                </p>
                <ul className="text-sm text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
                  {result.names.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>Импортировать ещё</Button>
              <Button onClick={() => { setOpen(false); window.location.reload(); }}>
                Готово
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
