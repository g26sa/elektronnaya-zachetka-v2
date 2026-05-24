import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, DocumentSignatures } from "@/components/documents/DocumentHeader";
import { admissionLabel, formatDate } from "@/lib/utils";

export default async function DefenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string; course?: string; group?: string; studentId?: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;

  const [institution, plan] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.teachingAssignment.findMany({
      where: {
        ...(session.role === "TEACHER" ? { teacherId: session.userId } : {}),
        kind: { in: ["VKR", "DEFENSE_CHAIR"] },
        studentId: { not: null },
      },
    }),
  ]);

  const studentIds = Array.from(new Set(plan.map((p) => p.studentId!)));
  const vkrs = studentIds.length === 0 ? [] : await prisma.vKR.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { include: { user: true, group: true } },
      defense: { include: { chair: true } },
    },
  });

  const rows = vkrs.filter((v) => {
    if (!v.defense) return false;
    const sp2 = v.student.group.speciality ?? "";
    if (sp.speciality && sp2 !== sp.speciality) return false;
    if (sp.course && String(v.student.currentCourse) !== sp.course) return false;
    if (sp.group && v.student.group.name !== sp.group) return false;
    if (sp.studentId && v.studentId !== sp.studentId) return false;
    return true;
  });

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]">
        <DocumentHeader
          institution={institution}
          title="Отчёт по защитам ВКР"
          subtitle={session.fullName}
          generatedAt={new Date()}
        />

        {rows.length === 0 ? (
          <p className="text-center italic">По заданным фильтрам записей нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Студент</th>
                <th>Группа</th>
                <th>Тема ВКР</th>
                <th>Допуск</th>
                <th>Дата защиты</th>
                <th>Оценка</th>
                <th>Председатель ГЭК</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => (
                <tr key={v.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{v.student.user.fullName}</td>
                  <td className="text-center">{v.student.group.name}</td>
                  <td>{v.topic}</td>
                  <td className="text-center">{admissionLabel(v.defense!.admission)}</td>
                  <td className="text-center">{formatDate(v.defense!.date)}</td>
                  <td className="text-center"><b>{v.defense!.grade ?? "—"}</b></td>
                  <td>{v.defense!.chair?.fullName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[11px] mt-3">Всего: {rows.length}.</p>
        <DocumentSignatures
          left={{ title: session.role === "HEAD" ? "Заведующий отделением" : "Преподаватель", name: session.fullName }}
          right={{ title: "Дата" }}
        />
      </div>
    </>
  );
}
