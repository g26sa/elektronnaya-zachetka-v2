"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  created: number;
  updated?: number;
  skipped: number;
  errors: number;
  total: number;
  imported?: number;
  incomplete?: boolean;
  warning?: string;
  parsedNames?: string[];
  createdNames: string[];
  updatedNames?: string[];
  skippedNames: string[];
  errorDetails: string[];
  group: string;
  enrollmentDate: string;
}

export function GroupImportDialog({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{ fileGroup: string; expectedGroup: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setError(null);
    setMismatch(null);
    setValidationErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Выберите файл"); return; }

    setLoading(true);
    setResult(null);
    setError(null);
    setMismatch(null);
    setValidationErrors([]);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("expectedGroupName", groupName);
      const res = await fetch("/api/import-students", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        if (data.groupMismatch) {
          setMismatch({ fileGroup: data.fileGroup, expectedGroup: data.expectedGroup });
        } else if (data.validationErrors?.length) {
          setError(data.error ?? "Ошибка валидации");
          setValidationErrors(data.validationErrors);
        } else {
          setError(data.error ?? "Ошибка импорта");
        }
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
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Импорт студентов
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт студентов — группа {groupName}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Загрузите заполненный шаблон (.xlsx / .xls / .xlsm).
            </p>

            <Button type="button" variant="ghost" size="sm" asChild>
              <a href="/shablon_importa_studentov.xlsm" download className="gap-2 inline-flex items-center">
                <Download className="h-4 w-4" />
                Скачать шаблон
              </a>
            </Button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer cursor-pointer"
            />

            {mismatch && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  В файле указана группа <strong>«{mismatch.fileGroup}»</strong>, но импорт открыт для группы <strong>«{mismatch.expectedGroup}»</strong>.
                  Проверьте ячейку B1 в шаблоне.
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 space-y-1">
                <div className="flex gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
                {validationErrors.length > 0 && (
                  <ul className="ml-6 space-y-0.5 list-disc text-xs max-h-40 overflow-y-auto">
                    {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Импортируем…" : "Загрузить"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Группа: <strong>{result.group}</strong></span>
              <span>·</span>
              <span>Зачисление: <strong>{result.enrollmentDate}</strong></span>
            </div>

            <p className="text-xs text-muted-foreground">
              Найдено в файле: <strong>{result.total}</strong> студентов
              {result.parsedNames && result.parsedNames.length > 0 && (
                <span className="block mt-1 text-[11px] leading-relaxed">
                  {result.parsedNames.join(" · ")}
                </span>
              )}
            </p>

            {result.incomplete && result.warning && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {result.warning}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-muted-foreground mt-1">Добавлено</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.updated ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Обновлено</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">Пропущено</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{result.errors}</p>
                <p className="text-xs text-muted-foreground mt-1">Ошибок</p>
              </div>
            </div>

            {result.createdNames.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Добавленные студенты
                </p>
                <ul className="text-sm text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
                  {result.createdNames.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            {(result.updatedNames?.length ?? 0) > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" /> Обновлены / перенесены
                </p>
                <ul className="text-sm text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                  {result.updatedNames!.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            {result.skippedNames.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Пропущены (дубликаты)
                </p>
                <ul className="text-sm text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                  {result.skippedNames.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            {result.errorDetails.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" /> Ошибки
                </p>
                <ul className="text-sm text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errorDetails.map((n, i) => <li key={i}>{n}</li>)}
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
