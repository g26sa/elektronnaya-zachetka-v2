import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, DocumentSignatures } from "@/components/documents/DocumentHeader";
import { formatDate } from "@/lib/utils";

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
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;

  const [institution, all] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.courseWork.findMany({
      where: { ...(session.role === "TEACHER" ? { teacherId: session.userId } : {}) },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        discipline: true,
        teacher: true,
      },
      orderBy: [{ assignedAt: "desc" }, { date: "desc" }],
    }),
  ]);

  const filtered = all.filter((c) => {
    if (sp.speciality && (c.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && String(c.semester.course) !== sp.course) return false;
    if (sp.group && c.student.group.name !== sp.group) return false;
    if (sp.discipline && c.discipline.name !== sp.discipline) return false;
    if (sp.semester && String(c.semester.number) !== sp.semester) return false;
    if (sp.studentId && c.studentId !== sp.studentId) return false;
    if (sp.scope === "graded" && !c.grade) return false;
    if (sp.scope === "topicOnly" && c.grade) return false;
    return true;
  });

  const onlyTopics = sp.scope === "topicOnly";
  const title = onlyTopics ? "Выданные темы курсовых работ" : "Курсовые работы";

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]">
        <DocumentHeader
          institution={institution}
          title={title}
          subtitle={session.fullName}
          generatedAt={new Date()}
        />

        {filtered.length === 0 ? (
          <p className="text-center italic">По заданным фильтрам записей нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Студент</th>
                <th>Группа</th>
                <th>Семестр</th>
                <th>Дисциплина</th>
                <th>Тема</th>
                <th>Оценка</th>
                <th>Дата</th>
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

        <p className="text-[11px] mt-4">
          {sp.speciality && `Специальность: «${sp.speciality}». `}
          {sp.group && `Группа: ${sp.group}. `}
          {sp.discipline && `Дисциплина: «${sp.discipline}». `}
          {sp.semester && `${sp.semester} семестр. `}
          Всего: {filtered.length}.
        </p>

        <DocumentSignatures
          left={{ title: session.role === "HEAD" ? "Заведующий отделением" : "Преподаватель", name: session.fullName }}
          right={{ title: "Дата" }}
        />
      </div>
    </>
  );
}
