"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveTemplate } from "../actions";
import { Save, Eye } from "lucide-react";

const SUGGESTED = [
  "{{institution.name}}",
  "{{institution.headName}}",
  "{{today}}",
  "{{student.fullName}}",
  "{{student.group}}",
  "{{student.recordBookNumber}}",
  "{{#each assessments}}…{{/each}}",
  "{{#if vkr}}…{{/if}}",
];

export function TemplateEditor({
  id,
  initial,
  existingPlaceholders,
  sampleStudentId,
}: {
  id: string;
  initial: { name: string; description: string; content: string; isActive: boolean };
  existingPlaceholders: string[];
  sampleStudentId: string | null;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [content, setContent] = useState(initial.content);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function regen(html: string) {
    if (!sampleStudentId) {
      setPreviewHtml("<p style='color:#888'>Нет демо-студента для предпросмотра</p>");
      return;
    }
    const res = await fetch(`/templates/${id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: html, studentId: sampleStudentId }),
    });
    const json = await res.json();
    setPreviewHtml(json.html ?? "");
  }

  useEffect(() => {
    const t = setTimeout(() => regen(content), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await saveTemplate({ id, name, description, content, isActive });
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Шаблон</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Активен</Label>
            <div>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Содержание шаблона (HTML + плейсхолдеры)</Label>
            <Textarea
              className="min-h-[400px] font-mono text-xs"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium">Подсказки по плейсхолдерам:</div>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED.map((p) => (
                <code key={p} className="rounded bg-secondary px-1.5 py-0.5">{p}</code>
              ))}
            </div>
            <div className="text-muted-foreground">
              Найдено в шаблоне: {existingPlaceholders.length} ({existingPlaceholders.slice(0, 6).join(", ")}{existingPlaceholders.length > 6 && "…"})
            </div>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {savedAt && <p className="text-sm text-success">Сохранено в {savedAt}</p>}

          <div className="flex gap-2">
            <Button onClick={save} disabled={pending}>
              <Save className="h-4 w-4 mr-2" />
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button variant="outline" onClick={() => regen(content)}>
              <Eye className="h-4 w-4 mr-2" />
              Обновить превью
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Предпросмотр</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border bg-white p-6 max-h-[800px] overflow-auto"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
