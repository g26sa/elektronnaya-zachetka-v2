import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { groupMatchesCourse } from "@/lib/group-course";

const ARCHIVE_REASON_LABEL: Record<string, string> = {
  EXPULSION: "Отчислен",
  ACADEMIC_LEAVE: "Академический отпуск",
};

export default async function PrintStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    speciality?: string;
    course?: string;
    group?: string;
  }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;
  const isArchive = sp.tab === "archive";

  const [institution, students] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.student.findMany({
      where: { user: { isActive: !isArchive } },
      include: {
        user: { select: { fullName: true, isActive: true } },
        group: { select: { name: true, speciality: true } },
      },
      orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
    }),
  ]);

  const filtered = students.filter((s) => {
    if (sp.speciality && (s.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(s.group.name, sp.course)) return false;
    if (sp.group && s.group.name !== sp.group) return false;
    return true;
  });

  const title = isArchive ? "Архив студентов" : "Список студентов";

  const subtitleParts: string[] = [];
  if (sp.speciality) subtitleParts.push(sp.speciality);
  if (sp.course) subtitleParts.push(`${sp.course} курс`);
  if (sp.group) subtitleParts.push(`гр. ${sp.group}`);

  const pdfFilename = [title, ...subtitleParts].join(" — ");

  return (
    <>
      <PrintBar filename={pdfFilename} />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title={title}
          subtitle={subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined}
          generatedAt={new Date()}
          showDateInHeader={false}
        />

        {filtered.length === 0 ? (
          <p className="text-center italic">Студентов не найдено.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "4%" }}>№</th>
                <th style={{ width: "35%" }}>ФИО</th>
                <th style={{ width: "12%" }}>Группа</th>
                <th style={{ width: "14%" }}>№ зач. книжки</th>
                <th style={{ width: "8%" }}>Курс</th>
                {isArchive && <th style={{ width: "27%" }}>Причина</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{s.user.fullName}</td>
                  <td className="text-center">{s.group.name}</td>
                  <td className="text-center">{s.recordBookNumber}</td>
                  <td className="text-center">{s.currentCourse}</td>
                  {isArchive && (
                    <td>{ARCHIVE_REASON_LABEL[(s as any).archiveReason ?? ""] ?? "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <TeacherReportFooter
          teacherName={session.fullName}
          institution={institution}
          date={new Date()}
          showTeacherSignature={false}
        />
      </div>
    </>
  );
}
