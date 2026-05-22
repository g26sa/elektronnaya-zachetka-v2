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
 *   VKR / DEFENSE_CHAIR / STATE_EXAM_CHAIR — студент (+опц. семестр)
 */
function clean(d: ReturnType<typeof planItemSchema.parse>) {
  const base: {
    teacherId: string;
    kind: string;
    notes: string | null;
    semesterId: string | null;
    disciplineId: string | null;
    groupId: string | null;
    studentId: string | null;
    hours: number | null;
  } = {
    teacherId: d.teacherId,
    kind: d.kind,
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
  const created = await prisma.teachingAssignment.create({ data });
  await audit({ userId: session.userId, action: "CREATE", entity: "TeachingAssignment", entityId: created.id, after: created });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
}

export async function updatePlanItem(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "plan:edit");
  const data = clean(planItemSchema.parse(input));
  const before = await prisma.teachingAssignment.findUnique({ where: { id } });
  const updated = await prisma.teachingAssignment.update({ where: { id }, data });
  await audit({ userId: session.userId, action: "UPDATE", entity: "TeachingAssignment", entityId: id, before, after: updated });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
}

export async function deletePlanItem(id: string) {
  const session = await getSession();
  assertCan(session, "plan:edit");
  const before = await prisma.teachingAssignment.findUnique({ where: { id } });
  await prisma.teachingAssignment.delete({ where: { id } });
  await audit({ userId: session.userId, action: "DELETE", entity: "TeachingAssignment", entityId: id, before });
  revalidatePath("/plan");
  revalidatePath("/my-plan");
}
