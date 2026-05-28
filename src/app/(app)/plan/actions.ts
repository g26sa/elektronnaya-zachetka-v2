"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { planItemSchema } from "@/schemas/plan";

/**
 * Нормализует поля под выбранный тип работы, чтобы в БД не попадали
 * «фантомные» значения от другого типа (например, студент или часы у практики).
 *
 *   ASSESSMENT     — дисциплина + семестр + группа + часы
 *   COURSEWORK     — дисциплина + семестр + группа
 *   PRACTICE       — семестр + группа
 *   VKR — курс + группа + студент (groupId для привязки, semesterId не используется)
 */
function clean(d: ReturnType<typeof planItemSchema.parse>) {
  const base: {
    teacherId: string;
    kind: string;
    controlForm: string | null;
    notes: string | null;
    semesterId: string | null;
    disciplineId: string | null;
    groupId: string | null;
    studentId: string | null;
    hours: number | null;
  } = {
    teacherId: d.teacherId,
    kind: d.kind,
    controlForm: d.kind === "ASSESSMENT" ? (d.controlForm ?? null) : null,
    notes: d.notes ?? null,
    semesterId: null,
    disciplineId: null,
    groupId: null,
    studentId: null,
    hours: null,
  };

  switch (d.kind) {
    case "ASSESSMENT":
      base.semesterId = d.semesterId || null;
      base.disciplineId = d.disciplineId || null;
      base.groupId = d.groupId || null;
      base.hours = d.hours ?? null;
      break;
    case "COURSEWORK":
      base.semesterId = d.semesterId || null;
      base.disciplineId = d.disciplineId || null;
      base.groupId = d.groupId || null;
      break;
    case "PRACTICE":
      base.semesterId = d.semesterId || null;
      base.groupId = d.groupId || null;
      break;
    case "VKR":
      base.groupId = d.groupId || null;
      base.studentId = d.studentId || null;
      break;
    case "DEFENSE_CHAIR":
    case "STATE_EXAM_CHAIR":
      base.studentId = d.studentId || null;
      base.semesterId = d.semesterId || null;
      break;
  }
  return base;
}

export async function createPlanItem(input: unknown) {
  const session = await getSession();
  assertCan(session, "plan:edit");
  const data = clean(planItemSchema.parse(input));
  const created = await (prisma.teachingAssignment.create as Function)({ data });
  await audit({ userId: session.userId, action: "CREATE", entity: "TeachingAssignment", entityId: created.id, after: created });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
  revalidatePath("/attestations");
  revalidatePath("/dashboard");
}

export async function updatePlanItem(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "plan:edit");
  const data = clean(planItemSchema.parse(input));
  const before = await prisma.teachingAssignment.findUnique({ where: { id } });
  const updated = await (prisma.teachingAssignment.update as Function)({ where: { id }, data });
  await audit({ userId: session.userId, action: "UPDATE", entity: "TeachingAssignment", entityId: id, before, after: updated });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
  revalidatePath("/attestations");
  revalidatePath("/dashboard");
}

export async function deletePlanItem(id: string) {
  const session = await getSession();
  assertCan(session, "plan:edit");
  const before = await prisma.teachingAssignment.findUnique({ where: { id } });

  // Если это план по дисциплине (ASSESSMENT) — удаляем связанные оценки студентов группы,
  // иначе при повторном добавлении плана оценки «всплывают» снова.
  if (
    before?.kind === "ASSESSMENT" &&
    before.teacherId &&
    before.disciplineId &&
    before.semesterId &&
    before.groupId
  ) {
    await prisma.assessment.deleteMany({
      where: {
        teacherId:    before.teacherId,
        disciplineId: before.disciplineId,
        semesterId:   before.semesterId,
        student: { groupId: before.groupId },
      },
    });
  }

  await prisma.teachingAssignment.delete({ where: { id } });
  await audit({ userId: session.userId, action: "DELETE", entity: "TeachingAssignment", entityId: id, before });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
  revalidatePath("/dashboard");
  revalidatePath("/attestations");
}
