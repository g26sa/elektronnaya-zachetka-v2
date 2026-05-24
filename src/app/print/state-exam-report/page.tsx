import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, DocumentSignatures } from "@/components/documents/DocumentHeader";
import { admissionLabel, formatDate } from "@/lib/utils";

export default async function StateExamReportPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string; course?: string; group?: string; studentId?: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;

  const [institution, plan] = await Promise.all([
    prisma.institution.findFirst(),
    session.role === "TEACHER"
      ? prisma.teachingAssignment.findMany({ where: { teacherId: session.userId } })
      : Promise.resolve([]),
  ]);

  // Видимость: HEAD — все, TEACHER — студенты его плана (по groupId или studentId)
  let where: { studentId?: { in: string[] } } = {};
  if (session.role === "TEACHER") {
    const studentIdsDirect = plan.map((p) => p.studentId).filter(Boolean) as string[];
    const groupIds = plan.map((p) => p.groupId).filter(Boolean) as string[];
    const fromGroups = groupIds.length > 0
      ? (await prisma.student.findMany({ where: { groupId: { in: groupIds } }, select: { id: true } })).map((s) => s.id)
      : [];
    const all = Array.from(new Set([...studentIdsDirect, ...fromGroups]));
    where = { studentId: { in: all.length > 0 ? all : ["__none__"] } };
  }

  const items = await prisma.stateExam.findMany({
    where,
    include: {
      student: { include: { user: true, group: true } },
      chair: true,
    },
    orderBy: { date: "desc" },
  });

  const rows = items.filter((e) => {
    if (sp.speciality && (e.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && String(e.student.currentCourse) !== sp.course) return false;
    if (sp.group && e.student.group.name !== sp.group) return false;
    if (sp.studentId && e.studentId !== sp.studentId) return false;
    return true;
  });

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]">
        <DocumentHeader
          institution={institution}
          title="Отчёт по государственному экзамену"
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
                <th>Экзамен</th>
                <th>Допуск</th>
                <th>Дата</th>
                <th>Оценка</th>
                <th>Председатель ГЭК</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{e.student.user.fullName}</td>
                  <td className="text-center">{e.student.group.name}</td>
                  <td>{e.name}</td>
                  <td className="text-center">{admissionLabel(e.admission)}</td>
                  <td className="text-center">{formatDate(e.date)}</td>
                  <td className="text-center"><b>{e.grade ?? "—"}</b></td>
                  <td>{e.chair?.fullName ?? "—"}</td>
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
