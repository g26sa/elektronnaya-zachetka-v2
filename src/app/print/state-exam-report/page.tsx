import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { admissionLabel, formatDate } from "@/lib/utils";
import { groupMatchesCourse } from "@/lib/group-course";

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
      chairGek: true,
    },
    orderBy: { date: "desc" },
  });

  const rows = items.filter((e) => {
    if (sp.speciality && (e.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(e.student.group.name, sp.course)) return false;
    if (sp.group && e.student.group.name !== sp.group) return false;
    if (sp.studentId && e.studentId !== sp.studentId) return false;
    return true;
  });

  return (
    <>
      <PrintBar filename="Государственный экзамен" />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title="Отчёт по государственному экзамену"
          generatedAt={new Date()}
          showDateInHeader={false}
        />

        {rows.length === 0 ? (
          <p className="text-center italic">По заданным фильтрам записей нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "4%" }}>№</th>
                <th style={{ width: "18%" }}>Студент</th>
                <th style={{ width: "8%" }}>Группа</th>
                <th style={{ width: "20%" }}>Экзамен</th>
                <th style={{ width: "10%" }}>Допуск</th>
                <th style={{ width: "10%" }}>Дата</th>
                <th style={{ width: "10%" }}>Оценка</th>
                <th style={{ width: "20%" }}>Председатель ГЭК</th>
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
                  <td>{(e as any).chairGek?.fullName ?? e.chair?.fullName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <TeacherReportFooter
          teacherName={session.fullName}
          institution={institution}
          date={new Date()}
          showTeacherSignature={session.role !== "HEAD"}
        />
      </div>
    </>
  );
}
