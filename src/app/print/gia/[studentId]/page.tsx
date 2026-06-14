import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/template";
import { buildStudentContext } from "@/lib/templateContext";
import { PrintBar } from "@/components/documents/PrintBar";
import { StudentDateFooter, TeacherReportFooter } from "@/components/documents/DocumentHeader";

export default async function PrintGIA({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await requireSession();
  const { studentId } = await params;
  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!me || me.id !== studentId) notFound();
  }

  const [ctx, institution] = await Promise.all([
    buildStudentContext(studentId),
    prisma.institution.findFirst(),
  ]);
  const tmpl = await prisma.documentTemplate.findUnique({ where: { code: "GIA_REPORT" } });
  const html = tmpl ? renderTemplate(tmpl.content, { ...ctx, today: "" } as unknown as Record<string, unknown>) : "<p>Шаблон не найден</p>";

  const now = new Date();

  return (
    <>
      <PrintBar filename={`ВКР — ${ctx.student.fullName}`} />
      <div className="document p-[15mm_20mm]">
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {session.role === "STUDENT" ? (
          <StudentDateFooter date={now} />
        ) : (
          <TeacherReportFooter
            teacherName={session.fullName}
            institution={institution}
            date={now}
            showDate={false}
            showTeacherSignature={session.role !== "HEAD"}
          />
        )}
      </div>
    </>
  );
}
