import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader } from "@/components/documents/DocumentHeader";
import { formatDate, practiceKindLabel } from "@/lib/utils";

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
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;

  const [institution, all] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.practice.findMany({
      where: { ...(session.role === "TEACHER" ? { instSupervisorId: session.userId } : {}) },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        instSupervisor: true,
      },
      orderBy: [{ startDate: "desc" }],
    }),
  ]);

  const filtered = all.filter((p) => {
    if (sp.speciality && (p.student.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && String(p.semester.course) !== sp.course) return false;
    if (sp.group && p.student.group.name !== sp.group) return false;
    if (sp.semester && String(p.semester.number) !== sp.semester) return false;
    if (sp.kind && p.kind !== sp.kind) return false;
    if (sp.studentId && p.studentId !== sp.studentId) return false;
    return true;
  });

  const isFiltered = !!(sp.speciality || sp.group || sp.semester || sp.kind || sp.studentId);
  const title = "Отчёт по практикам";

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
                <th>Вид</th>
                <th>Место</th>
                <th>Период</th>
                <th>Оценка</th>
                <th>Рук. организации</th>
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
                  <td className="text-center whitespace-nowrap">
                    {formatDate(p.startDate)} — {formatDate(p.endDate)}
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

        <p className="text-[11px] mt-2">
          Руководитель от учреждения: {session.fullName}.
        </p>
      </div>
    </>
  );
}
