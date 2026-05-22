"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

/**
 * Быстрое создание/обновление практики преподавателем:
 *   - семестр + группа берутся из плана PRACTICE
 *   - студент — только из выбранной группы
 *   - для «учебной» практики место подставляется из учреждения, рук. от организации не нужен
 *   - для производственной/преддипломной — место и орг. руководитель вводятся вручную
 *   - оценка опциональна (практика может быть зафиксирована до её выставления)
 */
const schema = z.object({
  id: z.string().optional(),
  semesterId: z.string().min(1, "Выберите семестр"),
  groupId: z.string().min(1, "Выберите группу"),
  studentId: z.string().min(1, "Выберите студента"),
  kind: z.enum(["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]),
  place: z.string().min(1, "Укажите место"),
  startDate: z.string().min(1, "Дата начала"),
  endDate: z.string().min(1, "Дата окончания"),
  grade: z.string().optional().nullable(),
  gradeDate: z.string().optional().nullable(),
  orgSupervisorName: z.string().optional().nullable(),
  orgSupervisorPosition: z.string().optional().nullable(),
});

async function ensureTeacherPlanAllows(teacherId: string, semesterId: string, groupId: string) {
  const plan = await prisma.teachingAssignment.findFirst({
    where: { teacherId, kind: "PRACTICE", semesterId, groupId },
  });
  if (!plan) throw new Error("В вашем плане нет практики для этой группы и семестра");
}

async function ensureStudentInGroup(studentId: string, groupId: string) {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!s || s.groupId !== groupId) throw new Error("Студент не из выбранной группы");
}

export async function savePracticeQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:create");
  const d = schema.parse(input);
  const teacherId = session.role === "TEACHER" ? session.userId : null;
  if (teacherId) {
    await ensureTeacherPlanAllows(teacherId, d.semesterId, d.groupId);
  }
  await ensureStudentInGroup(d.studentId, d.groupId);

  // Получаем курс из семестра (для совместимости с уже существующим полем Practice.course)
  const sem = await prisma.semester.findUnique({ where: { id: d.semesterId } });
  if (!sem) throw new Error("Семестр не найден");

  const data = {
    studentId: d.studentId,
    semesterId: d.semesterId,
    course: sem.course,
    kind: d.kind,
    place: d.place,
    hours: null as number | null,
    creditUnits: null as number | null,
    startDate: new Date(d.startDate),
    endDate: new Date(d.endDate),
    grade: d.grade || null,
    gradeDate: d.gradeDate ? new Date(d.gradeDate) : null,
    instSupervisorId: teacherId ?? session.userId,
    // Учебная практика → руководитель от организации не нужен
    orgSupervisorName: d.kind === "EDUCATIONAL" ? null : (d.orgSupervisorName ?? null),
    orgSupervisorPosition: d.kind === "EDUCATIONAL" ? null : (d.orgSupervisorPosition ?? null),
  };

  if (d.id) {
    const before = await prisma.practice.findUnique({ where: { id: d.id } });
    if (teacherId && before && before.instSupervisorId !== teacherId) {
      throw new Error("Можно редактировать только собственные практики");
    }
    const updated = await prisma.practice.update({ where: { id: d.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "Practice", entityId: d.id, before, after: updated });
  } else {
    const created = await prisma.practice.create({ data });
    await audit({ userId: session.userId, action: "CREATE", entity: "Practice", entityId: created.id, after: created });
  }
  revalidatePath("/practice");
}
