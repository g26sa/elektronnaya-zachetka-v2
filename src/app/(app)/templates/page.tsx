import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Pencil } from "lucide-react";

export default async function TemplatesPage() {
  await requireRole("HEAD");
  const templates = await prisma.documentTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Шаблоны отчётов</h1>
        <p className="text-muted-foreground">
          Редактируется без программирования. Поддержка плейсхолдеров <code>{"{{path}}"}</code>, циклов <code>{"{{#each items}}…{{/each}}"}</code>, условий <code>{"{{#if x}}…{{/if}}"}</code>.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>{t.name}</span>
                <Badge variant="outline">v{t.version}</Badge>
              </CardTitle>
              {t.description && <CardDescription>{t.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Код: <code>{t.code}</code> · обновлён {formatDate(t.updatedAt)}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/templates/${t.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Редактировать
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
