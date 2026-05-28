import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { formatDate } from "@/lib/utils";
import { groupMatchesCourse } from "@/lib/group-course";

export default async function VkrReportPage({
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
        kind: "VKR",
        studentId: { not: null },
      },
      include: { student: { include: { user: true, group: true } } },
    }),
  ]);

  const studentIds = Array.from(new Set(plan.map((p) => p.studentId!)));
  const vkrs = studentIds.length === 0 ? [] : await prisma.vKR.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { include: { user: true, group: true } },
      supervisor: true,
    },
  });

  const rows = vkrs.filter((v) => {
    const sp2 = v.student.group.speciality ?? "";
    if (sp.speciality && sp2 !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(v.student.group.name, sp.course)) return false;
    if (sp.group && v.student.group.name !== sp.group) return false;
    if (sp.studentId && v.studentId !== sp.studentId) return false;
    return true;
  });

  return (
    <>
      <PrintBar filename="Отчёт ВКР" />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title="Отчёт по ВКР"
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
                <th style={{ width: "32%" }}>Тема</th>
                <th style={{ width: "10%" }}>Вид</th>
                <th style={{ width: "12%" }}>Приказ</th>
                <th style={{ width: "16%" }}>Руководитель</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => (
                <tr key={v.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{v.student.user.fullName}</td>
                  <td className="text-center">{v.student.group.name}</td>
                  <td>{v.topic}</td>
                  <td>{v.type ?? "—"}</td>
                  <td className="text-center text-[11px]">
                    {v.approvedOrder ?? "—"}<br/>{formatDate(v.approvedDate)}
                  </td>
                  <td>{v.supervisor.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <TeacherReportFooter
          teacherName={session.fullName}
          institution={institution}
          date={new Date()}
          showDate={false}
          showTeacherSignature={session.role !== "HEAD"}
        />
      </div>
    </>
  );
}
