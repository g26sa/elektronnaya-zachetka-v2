import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { formatDate } from "@/lib/utils";
import { requireReportSession, resolveOwnStudentId } from "@/lib/student-print";
import { groupMatchesCourse } from "@/lib/group-course";

/**
 * Отчёт по курсовым с учётом фильтров из querystring.
 * scope: '' | 'graded' | 'topicOnly'
 *   - graded: только с оценкой
 *   - topicOnly: только выданные темы без оценки
 */
export default async function CourseworkReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    speciality?: string; course?: string; group?: string; discipline?: string;
    semester?: string; studentId?: string; scope?: string;
  }>;
}) {
  const session = await requireReportSession();
  const sp = await searchParams;
  const ownStudentId = session.role === "STUDENT" ? await resolveOwnStudentId(session) : null;
  const filterStudentId = ownStudentId ?? sp.studentId;

  const [institution, all, reportStudent] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.courseWork.findMany({
      where: {
        ...(session.role === "TEACHER" ? { teacherId: session.userId } : {}),
        ...(filterStudentId ? { studentId: filterStudentId } : {}),
      },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        discipline: true,
        teacher: true,
      },
      orderBy: [{ assignedAt: "desc" }, { date: "desc" }],
    }),
    filterStudentId
      ? prisma.student.findUnique({
          where: { id: filterStudentId },
          include: { user: true },
        })
      : Promise.resolve(null),
  ]);

  const filtered = all.filter((c) => {
    if (sp.speciality && (c.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(c.student.group.name, sp.course)) return false;
    if (sp.group && c.student.group.name !== sp.group) return false;
    if (sp.discipline && c.discipline.name !== sp.discipline) return false;
    if (sp.semester && String(c.semester.number) !== sp.semester) return false;
    if (filterStudentId && c.studentId !== filterStudentId) return false;
    if (sp.scope === "graded" && !c.grade) return false;
    if (sp.scope === "topicOnly" && c.grade) return false;
    return true;
  });

  const onlyTopics = sp.scope === "topicOnly";
  const title = onlyTopics ? "Выданные темы курсовых работ" : "Курсовые работы";

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
                <th style={{ width: "8%" }}>Группа</th>
                <th style={{ width: "6%" }}>Сем.</th>
                <th style={{ width: "18%" }}>Дисциплина</th>
                <th style={{ width: "28%" }}>Тема</th>
                <th style={{ width: "8%" }}>Оценка</th>
                <th style={{ width: "10%" }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{c.student.user.fullName}</td>
                  <td className="text-center">{c.student.group.name}</td>
                  <td className="text-center">{c.semester.number}</td>
                  <td>{c.discipline.name}</td>
                  <td>{c.topic}</td>
                  <td className="text-center">{c.grade ?? " "}</td>
                  <td className="text-center">
                    {c.grade ? formatDate(c.date) : `выдана ${formatDate(c.assignedAt)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(sp.speciality || sp.group || sp.discipline || sp.semester) && (
          <p className="text-[11px] mt-4">
            {sp.speciality && `Специальность: «${sp.speciality}». `}
            {sp.group && `Группа: ${sp.group}. `}
            {sp.discipline && `Дисциплина: «${sp.discipline}». `}
            {sp.semester && `${sp.semester} семестр. `}
          </p>
        )}

        {session.role !== "STUDENT" && (
          <TeacherReportFooter
            teacherName={session.fullName}
            institution={institution}
            date={new Date()}
            showDate={false}
            showTeacherSignature={session.role !== "HEAD"}
          />
        )}
      </div>
    </>
  );
}
