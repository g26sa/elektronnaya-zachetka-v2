import { prisma } from "@/lib/db";
import type { TeachingKind } from "@/types/enums";

/**
 * План преподавателя — записи, что он ведёт. Источник правды для
 * ограничения, какие дисциплины/группы/студенты доступны ему в формах.
 */
export async function getTeacherPlan(teacherId: string) {
  return prisma.teachingAssignment.findMany({
    where: { teacherId },
    include: {
      semester: true,
      discipline: true,
      group: true,
      student: { include: { user: true, group: true } },
    },
    orderBy: [
      { semester: { academicYear: "desc" } },
      { semester: { number: "asc" } },
      { discipline: { name: "asc" } },
    ],
  });
}

/** Список ID групп, которые преподаватель ведёт хоть как-то (через ASSESSMENT/COURSEWORK/PRACTICE). */
export async function getTeacherGroupIds(teacherId: string): Promise<string[]> {
  const items = await prisma.teachingAssignment.findMany({
    where: { teacherId, groupId: { not: null } },
    select: { groupId: true },
  });
  return Array.from(new Set(items.map((i) => i.groupId!).filter(Boolean)));
}

/** Все студенты, которых может видеть преподаватель: студенты его групп + явно привязанные (ВКР). */
export async function getTeacherStudentIds(teacherId: string): Promise<string[]> {
  const [items, fromGroups] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { teacherId, studentId: { not: null } },
      select: { studentId: true },
    }),
    (async () => {
      const groupIds = await getTeacherGroupIds(teacherId);
      if (groupIds.length === 0) return [];
      const students = await prisma.student.findMany({
        where: { groupId: { in: groupIds } },
        select: { id: true },
      });
      return students.map((s) => s.id);
    })(),
  ]);
  return Array.from(new Set([
    ...items.map((i) => i.studentId!).filter(Boolean),
    ...fromGroups,
  ]));
}

/** Дисциплины, которые препод ведёт в данном контексте (ASSESSMENT / COURSEWORK). */
export async function getTeacherDisciplineIds(teacherId: string, kind?: TeachingKind): Promise<string[]> {
  const items = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      disciplineId: { not: null },
      ...(kind ? { kind } : {}),
    },
    select: { disciplineId: true },
  });
  return Array.from(new Set(items.map((i) => i.disciplineId!).filter(Boolean)));
}

/**
 * Часы дисциплины из плана преподавателя (для конкретного семестра).
 * Возвращает первое найденное значение или null.
 */
export async function getPlannedHours(opts: {
  teacherId: string;
  disciplineId?: string | null;
  semesterId?: string | null;
  kind?: TeachingKind;
}): Promise<{ hours: number | null; creditUnits: null }> {
  if (!opts.disciplineId || !opts.semesterId) return { hours: null, creditUnits: null };
  const item = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId: opts.teacherId,
      disciplineId: opts.disciplineId,
      semesterId: opts.semesterId,
      ...(opts.kind ? { kind: opts.kind } : {}),
    },
    select: { hours: true },
  });
  return { hours: item?.hours ?? null, creditUnits: null };
}

export type TeacherPlanItem = Awaited<ReturnType<typeof getTeacherPlan>>[number];
