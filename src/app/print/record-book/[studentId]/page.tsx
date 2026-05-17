import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/template";
import { buildStudentContext } from "@/lib/templateContext";
import { PrintBar } from "@/components/documents/PrintBar";

export default async function PrintRecordBook({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await requireSession();
  const { studentId } = await params;

  // Студенту разрешено только своё
  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!me || me.id !== studentId) notFound();
  }

  const ctx = await buildStudentContext(studentId);
  const tmpl = await prisma.documentTemplate.findUnique({ where: { code: "RECORD_BOOK" } });
  const html = tmpl ? renderTemplate(tmpl.content, ctx as unknown as Record<string, unknown>) : "<p>Шаблон не найден</p>";

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
