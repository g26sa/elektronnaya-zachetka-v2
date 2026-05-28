import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter, StudentDateFooter } from "@/components/documents/DocumentHeader";
import { formatDate, practiceKindLabel } from "@/lib/utils";
import { requireReportSession, resolveOwnStudentId } from "@/lib/student-print";
import { groupMatchesCourse } from "@/lib/group-course";

/**
 * Отчёт по практикам преподавателя — вертикальный, A4 portrait.
 * Принимает фильтры из querystring: speciality, group, semester, kind, studentId.
 */
export default async function PracticeReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    speciality?: string; course?: string; group?: string; semester?: string; kind?: string; studentId?: string;
  }>;
}) {
  const session = await requireReportSession();
  const sp = await searchParams;
  const ownStudentId = session.role === "STUDENT" ? await resolveOwnStudentId(session) : null;
  const filterStudentId = ownStudentId ?? sp.studentId;

  const [institution, all, reportStudent] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.practice.findMany({
      where: {
        ...(session.role === "TEACHER" ? { instSupervisorId: session.userId } : {}),
        ...(filterStudentId ? { studentId: filterStudentId } : {}),
      },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        instSupervisor: true,
      },
      orderBy: [{ startDate: "desc" }],
    }),
    filterStudentId
      ? prisma.student.findUnique({
          where: { id: filterStudentId },
          include: { user: true },
        })
      : Promise.resolve(null),
  ]);

  const filtered = all.filter((p) => {
    if (sp.speciality && (p.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(p.student.group.name, sp.course)) return false;
    if (sp.group && p.student.group.name !== sp.group) return false;
    if (sp.semester && String(p.semester.number) !== sp.semester) return false;
    if (sp.kind && p.kind !== sp.kind) return false;
    if (filterStudentId && p.studentId !== filterStudentId) return false;
    return true;
  });

  const isFiltered = !!(sp.speciality || sp.group || sp.semester || sp.kind || filterStudentId);
  const title = "Отчёт по практикам";

  return (
    <>
      <PrintBar filename={title} />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title={title}
          generatedAt={new Date()}
          showDateInHeader={false}
        />

        {filtered.length === 0 ? (
          <p className="text-center italic">По заданным фильтрам записей нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "4%" }}>№</th>
                <th style={{ width: "18%" }}>Студент</th>
                <th style={{ width: "7%" }}>Группа</th>
                <th style={{ width: "5%" }}>Сем.</th>
                <th style={{ width: "12%" }}>Вид</th>
                <th style={{ width: "18%" }}>Место</th>
                <th style={{ width: "14%" }}>Период</th>
                <th style={{ width: "7%" }}>Оценка</th>
                <th style={{ width: "15%" }}>Рук. организации</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{p.student.user.fullName}</td>
                  <td className="text-center">{p.student.group.name}</td>
                  <td className="text-center">{p.semester.number}</td>
                  <td>{practiceKindLabel(p.kind)}</td>
                  <td>{p.place}</td>
                  <td className="text-center text-[11px] leading-snug">
                    <div>{formatDate(p.startDate)}</div>
                    <div>{formatDate(p.endDate)}</div>
                  </td>
                  <td className="text-center">{p.grade ?? " "}</td>
                  <td>{p.kind === "EDUCATIONAL" ? "—" : (p.orgSupervisorName ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isFiltered && (
          <p className="text-[11px] mt-3">
            Применены фильтры:
            {sp.speciality && ` специальность «${sp.speciality}»;`}
            {sp.group && ` группа ${sp.group};`}
            {sp.semester && ` ${sp.semester} семестр;`}
            {sp.kind && ` вид «${practiceKindLabel(sp.kind)}»;`}
          </p>
        )}

        {session.role === "STUDENT" ? (
          <StudentDateFooter date={new Date()} />
        ) : (
          <TeacherReportFooter
            teacherName={session.fullName}
            institution={institution}
            date={new Date()}
            showTeacherSignature={session.role !== "HEAD"}
          />
        )}
      </div>
    </>
  );
}
