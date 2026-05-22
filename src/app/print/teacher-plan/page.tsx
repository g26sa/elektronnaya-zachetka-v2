import { requireRole } from "@/lib/auth";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader } from "@/components/documents/DocumentHeader";
import { teachingKindLabel } from "@/types/enums";

export default async function TeacherPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string; course?: string; group?: string; semester?: string; discipline?: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const sp = await searchParams;
  const [institution, plan] = await Promise.all([
    prisma.institution.findFirst(),
    getTeacherPlan(session.userId),
  ]);

  const filtered = plan.filter((p) => {
    if (p.kind !== "ASSESSMENT") return false;
    if (!p.discipline || !p.group || !p.semester) return false;
    if (sp.speciality && (p.group.speciality ?? "") !== sp.speciality) return false;
    if (sp.course && String(p.semester.course) !== sp.course) return false;
    if (sp.group && p.group.name !== sp.group) return false;
    if (sp.semester && String(p.semester.number) !== sp.semester) return false;
    if (sp.discipline && p.discipline.name !== sp.discipline) return false;
    return true;
  });

  const isFiltered = !!(sp.speciality || sp.course || sp.group || sp.semester || sp.discipline);

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]">
        <DocumentHeader
          institution={institution}
          title={isFiltered ? "План преподавателя (по фильтру)" : "Учебный план преподавателя"}
          subtitle={session.fullName}
          generatedAt={new Date()}
        />

        {filtered.length === 0 ? (
          <p className="text-center italic">Записей нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Дисциплина</th>
                <th>Группа</th>
                <th>Специальность</th>
                <th>Семестр</th>
                <th>Уч. год</th>
                <th>Часы</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{p.discipline!.name}</td>
                  <td className="text-center">{p.group!.name}</td>
                  <td>{p.group!.speciality ?? "—"}</td>
                  <td className="text-center">{p.semester!.number}</td>
                  <td className="text-center">{p.semester!.academicYear}</td>
                  <td className="text-center">{p.hours ?? "—"}</td>
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
            {sp.discipline && ` дисциплина «${sp.discipline}»;`}
          </p>
        )}
      </div>
    </>
  );
}
