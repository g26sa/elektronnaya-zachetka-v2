import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { admissionLabel, formatDate } from "@/lib/utils";
import { groupMatchesCourse } from "@/lib/group-course";

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
    if (sp.course && !groupMatchesCourse(v.student.group.name, sp.course)) return false;
    if (sp.group && v.student.group.name !== sp.group) return false;
    if (sp.studentId && v.studentId !== sp.studentId) return false;
    return true;
  });

  return (
    <>
      <PrintBar filename="Отчёт по защитам ВКР" />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title="Отчёт по защитам ВКР"
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
                <th style={{ width: "24%" }}>Тема ВКР</th>
                <th style={{ width: "10%" }}>Допуск</th>
                <th style={{ width: "10%" }}>Дата</th>
                <th style={{ width: "8%" }}>Оценка</th>
                <th style={{ width: "18%" }}>Председатель ГЭК</th>
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
