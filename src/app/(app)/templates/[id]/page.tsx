import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TemplateEditor } from "./TemplateEditor";
import { extractPlaceholders } from "@/lib/template";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function TemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("HEAD");
  const { id } = await params;
  const t = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!t) notFound();

  // Тестовый студент для предпросмотра
  const sampleStudent = await prisma.student.findFirst({ orderBy: { recordBookNumber: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/templates" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-1">
            <ChevronLeft className="h-3 w-3" /> К списку
          </Link>
          <h1 className="text-2xl font-semibold">{t.name}</h1>
          <p className="text-muted-foreground text-sm">Код: <code>{t.code}</code></p>
        </div>
      </div>

      <TemplateEditor
        id={t.id}
        initial={{
          name: t.name,
          description: t.description ?? "",
          content: t.content,
          isActive: t.isActive,
        }}
        existingPlaceholders={extractPlaceholders(t.content)}
        sampleStudentId={sampleStudent?.id ?? null}
      />
    </div>
  );
}
