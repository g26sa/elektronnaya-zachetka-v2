import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader } from "@/components/documents/DocumentHeader";
import { assessmentTypeLabel, formatDate } from "@/lib/utils";

/**
 * Отчёт по конкретной дисциплине из плана преподавателя:
 * шапка с дисциплиной/группой/семестром/часами + таблица оценок.
 */
export default async function PlanRecordsPrintPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const { planId } = await params;

  const [institution, plan] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.teachingAssignment.findUnique({
      where: { id: planId },
      include: {
        teacher: { select: { fullName: true } },
        discipline: true,
        semester: true,
        group: true,
      },
    }),
  ]);
  if (!plan || plan.kind !== "ASSESSMENT" || !plan.discipline || !plan.semester || !plan.group) notFound();
  if (session.role === "TEACHER" && plan.teacherId !== session.userId) notFound();

  const records = await prisma.assessment.findMany({
    where: {
      teacherId: plan.teacherId,
      disciplineId: plan.disciplineId!,
      semesterId: plan.semesterId!,
      student: { groupId: plan.groupId! },
    },
    include: { student: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  return (
    <>
      <PrintBar />
      <div className="document p-[24mm]">
        <DocumentHeader
          institution={institution}
          title="Ведомость промежуточной аттестации"
          subtitle={
            `${plan.discipline.name} · группа ${plan.group.name} · ${plan.semester.number} семестр (${plan.semester.academicYear})`
          }
          generatedAt={new Date()}
        />

        <table>
          <tbody>
            <tr><th className="w-1/3 text-left">Преподаватель</th><td>{plan.teacher.fullName}</td></tr>
            <tr><th className="text-left">Дисциплина</th><td>{plan.discipline.name}</td></tr>
            <tr><th className="text-left">Группа</th><td>{plan.group.name}</td></tr>
            {plan.group.speciality && (
              <tr><th className="text-left">Специальность</th><td>{plan.group.speciality}</td></tr>
            )}
            <tr><th className="text-left">Семестр</th><td>{plan.semester.number} ({plan.semester.academicYear} уч. г.)</td></tr>
            {plan.hours != null && (
              <tr><th className="text-left">Кол-во часов</th><td>{plan.hours}</td></tr>
            )}
          </tbody>
        </table>

        <h2>Выставленные оценки</h2>
        {records.length === 0 ? (
          <p className="text-center italic">Оценок ещё нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Студент</th>
                <th>Форма контроля</th>
                <th>Оценка</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-center">{i + 1}</td>
                  <td>{r.student.user.fullName}</td>
                  <td>{assessmentTypeLabel(r.type)}</td>
                  <td className="text-center"><b>{r.grade}</b></td>
                  <td className="text-center">{formatDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
