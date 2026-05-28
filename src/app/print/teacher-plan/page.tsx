import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintBar } from "@/components/documents/PrintBar";
import { DocumentHeader, TeacherReportFooter } from "@/components/documents/DocumentHeader";
import { courseFromGroupName, groupMatchesCourse } from "@/lib/group-course";
import { practiceKindLabel } from "@/lib/utils";
import { teachingKindLabel, type TeachingKind } from "@/types/enums";
import { PracticeKindValues } from "@/types/enums";

const PLAN_KINDS = ["ASSESSMENT", "COURSEWORK", "PRACTICE", "VKR"] as const;

const KIND_REPORT_TITLE: Record<(typeof PLAN_KINDS)[number], string> = {
  ASSESSMENT: "План преподавателей — дисциплины",
  COURSEWORK: "План преподавателей — курсовые работы",
  PRACTICE: "План преподавателей — практики",
  VKR: "План преподавателей — руководство ВКР",
};

type PlanPrintParams = {
  kind?: string;
  teacher?: string;
  speciality?: string;
  course?: string;
  group?: string;
  discipline?: string;
  student?: string;
  semester?: string;
};

function parsePracticeKind(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const t = notes.trim().toUpperCase();
  if ((PracticeKindValues as readonly string[]).includes(t)) {
    return practiceKindLabel(t);
  }
  const lower = notes.toLowerCase();
  if (lower.includes("учебн")) return practiceKindLabel("EDUCATIONAL");
  if (lower.includes("производ")) return practiceKindLabel("PRODUCTION");
  if (lower.includes("преддиплом")) return practiceKindLabel("PREDIPLOMA");
  return notes.trim();
}

export default async function TeacherPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<PlanPrintParams>;
}) {
  const session = await requireRole("HEAD", "TEACHER");

  const sp = await searchParams;
  const kind = (
    PLAN_KINDS.includes(sp.kind as (typeof PLAN_KINDS)[number])
      ? sp.kind
      : "ASSESSMENT"
  ) as TeachingKind;

  const teacherId = session.role === "TEACHER" ? session.userId : sp.teacher;

  const [institution, items] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.teachingAssignment.findMany({
      where: {
        kind,
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        teacher: { select: { fullName: true } },
        semester: true,
        discipline: true,
        group: true,
        student: { include: { user: true, group: true } },
      },
      orderBy: [
        { teacher: { fullName: "asc" } },
        { semester: { course: "asc" } },
        { semester: { number: "asc" } },
        { discipline: { name: "asc" } },
      ],
    }),
  ]);

  let filtered = items;

  if (sp.speciality) {
    filtered = filtered.filter(
      (i) => (i.group?.speciality ?? i.student?.group.speciality ?? "") === sp.speciality
    );
  }
  if (sp.course) {
    filtered = filtered.filter((i) => {
      const gName = i.group?.name ?? i.student?.group.name;
      return gName ? groupMatchesCourse(gName, sp.course!) : false;
    });
  }
  if (sp.group) {
    filtered = filtered.filter(
      (i) => (i.group?.name ?? i.student?.group.name) === sp.group
    );
  }
  if (sp.discipline && (kind === "ASSESSMENT" || kind === "COURSEWORK")) {
    filtered = filtered.filter((i) => i.discipline?.name === sp.discipline);
  }
  if (sp.student && kind === "VKR") {
    filtered = filtered.filter((i) => i.studentId === sp.student);
  }
  if (sp.semester) {
    filtered = filtered.filter((i) => String(i.semester?.number ?? "") === sp.semester);
  }

  const isFiltered = !!(
    teacherId ||
    sp.speciality ||
    sp.course ||
    sp.group ||
    sp.discipline ||
    sp.student ||
    sp.semester
  );

  const baseTitle = KIND_REPORT_TITLE[kind as (typeof PLAN_KINDS)[number]] ?? teachingKindLabel(kind);
  const title = isFiltered ? `${baseTitle} (по фильтру)` : baseTitle;

  let subtitle = session.fullName;
  if (session.role === "HEAD") {
    if (teacherId) {
      const t = items.find((i) => i.teacherId === teacherId)?.teacher.fullName;
      subtitle = t ?? "Преподаватель";
    } else {
      subtitle = "Все преподаватели";
    }
  }

  const isVkr = kind === "VKR";
  const hasDiscipline = kind === "ASSESSMENT" || kind === "COURSEWORK";
  const showHours = kind === "ASSESSMENT";
  const showPracticeKind = kind === "PRACTICE";

  const filterParts: string[] = [];
  if (teacherId && session.role === "HEAD") {
    const tn = items.find((i) => i.teacherId === teacherId)?.teacher.fullName;
    if (tn) filterParts.push(`преподаватель «${tn}»`);
  }
  if (sp.speciality) filterParts.push(`специальность «${sp.speciality}»`);
  if (sp.course) filterParts.push(`курс ${sp.course}`);
  if (sp.group) filterParts.push(`группа ${sp.group}`);
  if (sp.semester) filterParts.push(`${sp.semester} семестр`);
  if (sp.discipline) filterParts.push(`дисциплина «${sp.discipline}»`);
  if (sp.student) {
    const sn = items.find((i) => i.studentId === sp.student)?.student?.user.fullName;
    if (sn) filterParts.push(`студент ${sn}`);
  }

  return (
    <>
      <PrintBar filename={title} />
      <div className="document p-[15mm_20mm]">
        <DocumentHeader
          institution={institution}
          title={title}
          subtitle={subtitle}
          generatedAt={new Date()}
          showDateInHeader={false}
        />

        {filtered.length === 0 ? (
          <p className="text-center italic">
            {isFiltered ? "По заданным фильтрам записей нет." : "Нет назначений в плане."}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Преподаватель</th>
                <th>Курс / сем.</th>
                {!isVkr && <th>Группа</th>}
                {hasDiscipline && <th>Дисциплина</th>}
                {showPracticeKind && <th>Вид практики</th>}
                {isVkr && <th>Студент</th>}
                {showHours && <th>Часы</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => {
                const groupName = it.group?.name ?? it.student?.group.name;
                const courseNum = groupName ? courseFromGroupName(groupName) : null;
                const semLabel = it.semester
                  ? `${courseNum ?? it.semester.course}к, ${it.semester.number} сем. (${it.semester.academicYear})`
                  : courseNum
                    ? `${courseNum}к`
                    : "—";
                const practiceLabel = showPracticeKind ? parsePracticeKind(it.notes) : null;

                return (
                  <tr key={it.id}>
                    <td className="text-center">{i + 1}</td>
                    <td>{it.teacher.fullName}</td>
                    <td className="text-center">{semLabel}</td>
                    {!isVkr && <td className="text-center">{groupName ?? "—"}</td>}
                    {hasDiscipline && <td>{it.discipline?.name ?? "—"}</td>}
                    {showPracticeKind && <td>{practiceLabel ?? "—"}</td>}
                    {isVkr && <td>{it.student?.user.fullName ?? "—"}</td>}
                    {showHours && <td className="text-center">{it.hours ?? "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {isFiltered && filterParts.length > 0 && (
          <p className="text-[11px] mt-3 text-muted-foreground">
            Применены фильтры: {filterParts.join("; ")}.
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
