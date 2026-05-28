import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { formatDate, assessmentTypeLabel } from "@/lib/utils";
import { groupMatchesCourse } from "@/lib/group-course";

export default async function AttestationReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    speciality?: string; course?: string; group?: string;
    studentId?: string; discipline?: string; dateFrom?: string; dateTo?: string;
  }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;

  const [institution, assessments] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.assessment.findMany({
      where: {
        ...(session.role === "TEACHER" ? { teacherId: session.userId } : {}),
        ...(sp.studentId ? { studentId: sp.studentId } : {}),
        ...(sp.discipline ? { discipline: { name: sp.discipline } } : {}),
        ...(sp.dateFrom || sp.dateTo ? {
          date: {
            ...(sp.dateFrom ? { gte: new Date(sp.dateFrom) } : {}),
            ...(sp.dateTo ? { lte: new Date(sp.dateTo + "T23:59:59") } : {}),
          }
        } : {}),
      },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        discipline: true,
        teacher: true,
      },
      orderBy: [{ date: "desc" }],
    }),
  ]);

  const filtered = assessments.filter((a) => {
    if (sp.speciality && (a.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && !groupMatchesCourse(a.student.group.name, sp.course)) return false;
    if (sp.group && a.student.group.name !== sp.group) return false;
    return true;
  });

  const titleParts: string[] = [];
  if (sp.speciality) titleParts.push(sp.speciality);
  if (sp.group) titleParts.push(`гр. ${sp.group}`);
  if (sp.discipline) titleParts.push(sp.discipline);

  const pdfFilename = ["Дисциплины", ...titleParts].join(" — ");

  return (
    <>
      <PrintBar filename={pdfFilename} />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title="Дисциплины"
          subtitle={titleParts.length > 0 ? titleParts.join(" · ") : undefined}
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
                <th style={{ width: "22%" }}>Студент</th>
                <th style={{ width: "8%" }}>Группа</th>
                <th style={{ width: "8%" }}>Сем.</th>
                <th style={{ width: "22%" }}>Дисциплина</th>
                <th style={{ width: "10%" }}>Тип</th>
                <th style={{ width: "10%" }}>Оценка</th>
                <th style={{ width: "10%" }}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{a.student.user.fullName}</td>
                  <td className="text-center">{a.student.group.name}</td>
                  <td className="text-center">{a.semester.number}</td>
                  <td>{a.discipline.name}</td>
                  <td className="text-center">{assessmentTypeLabel(a.type)}</td>
                  <td className="text-center font-semibold">{a.grade}</td>
                  <td className="text-center">{formatDate(a.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(sp.dateFrom || sp.dateTo) && (
          <p className="text-[11px] mt-4">
            {sp.dateFrom && `Период: с ${sp.dateFrom}`}
            {sp.dateTo && ` по ${sp.dateTo}`}.
          </p>
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
