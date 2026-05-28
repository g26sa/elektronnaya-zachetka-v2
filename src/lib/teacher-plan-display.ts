import { prisma } from "@/lib/db";
import { practiceKindLabel } from "@/lib/utils";
import type { PracticeKind, TeachingKind } from "@/types/enums";
import { PracticeKindValues } from "@/types/enums";
import type { TeacherPlanItem } from "@/lib/teacherPlan";

export type PlanDisplayRow = TeacherPlanItem & {
  displayTitle: string;
  displaySubtitle: string;
};

/** Фильтры для страниц преподавателя (из query string). */
export type TeacherListFilters = {
  studentId?: string;
  group?: string;
  semester?: string;
  discipline?: string;
  kind?: string;
};

/** URL перехода с главной / из плана. */
export function planItemHref(
  it: Pick<
    TeacherPlanItem,
    "id" | "kind" | "studentId" | "group" | "semester" | "discipline"
  >
): string {
  switch (it.kind) {
    case "ASSESSMENT":
      return `/attestations/${it.id}`;
    case "VKR":
      return it.studentId
        ? `/gia?studentId=${encodeURIComponent(it.studentId)}`
        : "/gia";
    case "PRACTICE": {
      const q = new URLSearchParams();
      if (it.group?.name) q.set("group", it.group.name);
      if (it.semester?.number != null) q.set("semester", String(it.semester.number));
      const qs = q.toString();
      return qs ? `/practice?${qs}` : "/practice";
    }
    case "COURSEWORK": {
      const q = new URLSearchParams();
      if (it.group?.name) q.set("group", it.group.name);
      if (it.semester?.number != null) q.set("semester", String(it.semester.number));
      if (it.discipline?.name) q.set("discipline", it.discipline.name);
      if (it.studentId) q.set("studentId", it.studentId);
      const qs = q.toString();
      return qs ? `/coursework?${qs}` : "/coursework";
    }
    case "DEFENSE_CHAIR":
      return it.studentId
        ? `/defense?studentId=${encodeURIComponent(it.studentId)}`
        : "/defense";
    case "STATE_EXAM_CHAIR":
      return it.studentId
        ? `/state-exam?studentId=${encodeURIComponent(it.studentId)}`
        : "/state-exam";
    default:
      return "/dashboard";
  }
}

const STUDENT_KINDS = new Set<TeachingKind>(["VKR", "DEFENSE_CHAIR", "STATE_EXAM_CHAIR"]);

function parsePracticeKind(notes: string | null | undefined): PracticeKind | null {
  if (!notes?.trim()) return null;
  const t = notes.trim().toUpperCase();
  if ((PracticeKindValues as readonly string[]).includes(t)) return t as PracticeKind;
  const lower = notes.toLowerCase();
  if (lower.includes("учебн")) return "EDUCATIONAL";
  if (lower.includes("производ")) return "PRODUCTION";
  if (lower.includes("преддиплом")) return "PREDIPLOMA";
  return null;
}

function dedupeKey(it: TeacherPlanItem): string {
  switch (it.kind) {
    case "VKR":
    case "DEFENSE_CHAIR":
    case "STATE_EXAM_CHAIR":
      return `${it.kind}:${it.studentId ?? ""}:${it.semesterId ?? ""}`;
    case "PRACTICE":
      return `${it.kind}:${it.groupId ?? ""}:${it.semesterId ?? ""}`;
    default:
      return `${it.kind}:${it.disciplineId ?? ""}:${it.groupId ?? ""}:${it.semesterId ?? ""}`;
  }
}

/**
 * Ключи фактических записей в БД (не план).
 * На главной преподавателя показываем только то, что уже заведено.
 */
export type ActualWorkKeys = {
  assessmentKeys: Set<string>;
  vkrStudentIds: Set<string>;
  practiceGroupSem: Set<string>;
  courseworkKeys: Set<string>;
  defenseStudentIds: Set<string>;
  stateExamStudentIds: Set<string>;
};

export async function loadActualWorkKeys(teacherId: string): Promise<ActualWorkKeys> {
  const [assessments, vkrs, practices, courseWorks, defenses, stateExams] = await Promise.all([
    prisma.assessment.findMany({
      where: { teacherId },
      select: { disciplineId: true, semesterId: true, student: { select: { groupId: true } } },
    }),
    prisma.vKR.findMany({
      where: { supervisorId: teacherId },
      select: { studentId: true },
    }),
    prisma.practice.findMany({
      where: { instSupervisorId: teacherId },
      select: { semesterId: true, student: { select: { groupId: true } } },
    }),
    prisma.courseWork.findMany({
      where: { teacherId },
      select: { disciplineId: true, semesterId: true, student: { select: { groupId: true } } },
    }),
    prisma.defense.findMany({
      where: { admission: "ADMITTED" },
      select: {
        vkr: {
          select: {
            studentId: true,
            supervisorId: true,
            student: {
              select: {
                teachingAssignments: {
                  where: { teacherId, kind: "DEFENSE_CHAIR" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.stateExam.findMany({
      where: { chairId: teacherId },
      select: { studentId: true },
    }),
  ]);

  return {
    assessmentKeys: new Set(
      assessments.map(
        (a) => `${a.disciplineId}:${a.semesterId}:${a.student.groupId}`
      )
    ),
    vkrStudentIds: new Set(vkrs.map((v) => v.studentId)),
    practiceGroupSem: new Set(
      practices.map((p) => `${p.student.groupId}:${p.semesterId}`)
    ),
    courseworkKeys: new Set(
      courseWorks.map(
        (c) => `${c.disciplineId}:${c.semesterId}:${c.student.groupId}`
      )
    ),
    defenseStudentIds: new Set(
      defenses
        .filter(
          (d) =>
            d.vkr.supervisorId === teacherId ||
            d.vkr.student.teachingAssignments.length > 0
        )
        .map((d) => d.vkr.studentId)
    ),
    stateExamStudentIds: new Set(stateExams.map((s) => s.studentId)),
  };
}

/** Есть ли в системе данные по этому назначению из плана. */
export function planItemHasActualWork(
  it: TeacherPlanItem,
  keys: ActualWorkKeys
): boolean {
  switch (it.kind) {
    case "ASSESSMENT":
      return (
        !!it.disciplineId &&
        !!it.semesterId &&
        !!it.groupId &&
        keys.assessmentKeys.has(
          `${it.disciplineId}:${it.semesterId}:${it.groupId}`
        )
      );
    case "VKR":
      return !!it.studentId && keys.vkrStudentIds.has(it.studentId);
    case "PRACTICE":
      return (
        !!it.groupId &&
        !!it.semesterId &&
        keys.practiceGroupSem.has(`${it.groupId}:${it.semesterId}`)
      );
    case "COURSEWORK":
      return (
        !!it.disciplineId &&
        !!it.semesterId &&
        !!it.groupId &&
        keys.courseworkKeys.has(
          `${it.disciplineId}:${it.semesterId}:${it.groupId}`
        )
      );
    case "DEFENSE_CHAIR":
      return !!it.studentId && keys.defenseStudentIds.has(it.studentId);
    case "STATE_EXAM_CHAIR":
      return !!it.studentId && keys.stateExamStudentIds.has(it.studentId);
    default:
      return true;
  }
}

/** Убирает дубликаты (часто две одинаковые практики в плане на одну группу/семестр). */
export function dedupePlanItems(items: TeacherPlanItem[]): TeacherPlanItem[] {
  const map = new Map<string, TeacherPlanItem>();
  for (const it of items) {
    const key = dedupeKey(it);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, it);
      continue;
    }
    const score = (x: TeacherPlanItem) =>
      (x.notes ? 2 : 0) + (x.hours ? 1 : 0) + (x.studentId ? 1 : 0);
    if (score(it) > score(prev)) map.set(key, it);
  }
  return Array.from(map.values());
}

export type GetTeacherPlanForDisplayOptions = {
  /** true — только назначения, по которым уже есть ВКР/практика и т.д. (главная). */
  onlyWithActualWork?: boolean;
};

export async function getTeacherPlanForDisplay(
  teacherId: string,
  options: GetTeacherPlanForDisplayOptions = {}
): Promise<PlanDisplayRow[]> {
  const { getTeacherPlan } = await import("@/lib/teacherPlan");
  const raw = await getTeacherPlan(teacherId);
  let plan = dedupePlanItems(raw);

  if (options.onlyWithActualWork) {
    const keys = await loadActualWorkKeys(teacherId);
    plan = plan.filter((it) => planItemHasActualWork(it, keys));
  }

  const studentIds = plan
    .filter((p) => STUDENT_KINDS.has(p.kind as TeachingKind) && p.studentId)
    .map((p) => p.studentId!);

  const practiceItems = plan.filter((p) => p.kind === "PRACTICE" && p.groupId && p.semesterId);
  const groupIds = [...new Set(practiceItems.map((p) => p.groupId!))];
  const semesterIds = [...new Set(practiceItems.map((p) => p.semesterId!))];

  const [vkrs, practices] = await Promise.all([
    studentIds.length > 0
      ? prisma.vKR.findMany({
          where: { studentId: { in: studentIds }, supervisorId: teacherId },
          select: { studentId: true, topic: true },
        })
      : Promise.resolve([]),
    groupIds.length > 0 && semesterIds.length > 0
      ? prisma.practice.findMany({
          where: {
            instSupervisorId: teacherId,
            semesterId: { in: semesterIds },
            student: { groupId: { in: groupIds } },
          },
          select: { kind: true, semesterId: true, student: { select: { groupId: true } } },
        })
      : Promise.resolve([]),
  ]);

  const vkrTopicByStudent = new Map(vkrs.map((v) => [v.studentId, v.topic]));
  const practiceKindByGroupSem = new Map<string, PracticeKind>();
  for (const p of practices) {
    const key = `${p.student.groupId}:${p.semesterId}`;
    if (!practiceKindByGroupSem.has(key)) {
      practiceKindByGroupSem.set(key, p.kind as PracticeKind);
    }
  }

  return plan.map((it) => {
    const semPart = it.semester ? `${it.semester.number} сем.` : null;
    const groupPart = it.group ? `группа ${it.group.name}` : it.student?.group ? `группа ${it.student.group.name}` : null;

    if (STUDENT_KINDS.has(it.kind as TeachingKind)) {
      const title = it.student?.user.fullName ?? "Студент не указан";
      const subtitleParts: string[] = [];
      if (semPart) subtitleParts.push(semPart);
      if (groupPart) subtitleParts.push(groupPart);
      if (it.kind === "VKR" && it.studentId) {
        const topic = vkrTopicByStudent.get(it.studentId) ?? it.notes?.trim();
        if (topic) subtitleParts.push(`тема: ${topic}`);
      } else if (it.notes?.trim()) {
        subtitleParts.push(it.notes.trim());
      }
      if (it.hours != null && it.hours > 0) subtitleParts.push(`${it.hours} ч.`);
      return {
        ...it,
        displayTitle: title,
        displaySubtitle: subtitleParts.join(" · "),
      };
    }

    if (it.kind === "PRACTICE") {
      const lookupKey =
        it.groupId && it.semesterId ? `${it.groupId}:${it.semesterId}` : null;
      const kindFromDb = lookupKey ? practiceKindByGroupSem.get(lookupKey) : undefined;
      const kindFromNotes = parsePracticeKind(it.notes);
      const kind = kindFromNotes ?? kindFromDb;
      const title = kind ? `${practiceKindLabel(kind)} практика` : it.group ? `Практика · ${it.group.name}` : "Практика";
      const subtitleParts: string[] = [];
      if (semPart) subtitleParts.push(semPart);
      if (it.group && !title.includes(it.group.name)) subtitleParts.push(`группа ${it.group.name}`);
      if (it.hours != null && it.hours > 0) subtitleParts.push(`${it.hours} ч.`);
      return {
        ...it,
        displayTitle: title,
        displaySubtitle: subtitleParts.join(" · "),
      };
    }

    const title = it.discipline?.name ?? "—";
    const subtitleParts: string[] = [];
    if (semPart) subtitleParts.push(semPart);
    if (groupPart) subtitleParts.push(groupPart);
    if (it.hours != null && it.hours > 0) subtitleParts.push(`${it.hours} ч.`);
    if (it.notes?.trim()) subtitleParts.push(it.notes.trim());
    return {
      ...it,
      displayTitle: title,
      displaySubtitle: subtitleParts.join(" · "),
    };
  });
}
