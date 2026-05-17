"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { assessmentSchema } from "@/schemas/assessment";

export async function createAssessment(input: unknown) {
  const session = await getSession();
  assertCan(session, "assessment:create");
  const data = assessmentSchema.parse(input);
  const created = await prisma.assessment.create({
    data: {
      studentId: data.studentId,
      semesterId: data.semesterId,
      disciplineId: data.disciplineId,
      type: data.type,
      grade: data.grade,
      hours: data.hours ?? null,
      creditUnits: data.creditUnits ?? null,
      date: new Date(data.date),
      teacherId: data.teacherId,
      protocolNumber: data.protocolNumber ?? null,
    },
  });
  await audit({
    userId: session.userId,
    action: "CREATE",
    entity: "Assessment",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/attestations");
  return { ok: true, id: created.id };
}

export async function updateAssessment(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "assessment:edit");
  const data = assessmentSchema.parse(input);
  const before = await prisma.assessment.findUnique({ where: { id } });
  const updated = await prisma.assessment.update({
    where: { id },
    data: {
      studentId: data.studentId,
      semesterId: data.semesterId,
      disciplineId: data.disciplineId,
      type: data.type,
      grade: data.grade,
      hours: data.hours ?? null,
      creditUnits: data.creditUnits ?? null,
      date: new Date(data.date),
      teacherId: data.teacherId,
      protocolNumber: data.protocolNumber ?? null,
    },
  });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "Assessment",
    entityId: id,
    before,
    after: updated,
  });
  revalidatePath("/attestations");
  return { ok: true };
}

export async function deleteAssessment(id: string) {
  const session = await getSession();
  if (!can(session, "assessment:delete")) throw new Error("Нет прав");
  const before = await prisma.assessment.findUnique({ where: { id } });
  await prisma.assessment.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "Assessment", entityId: id, before });
  revalidatePath("/attestations");
  return { ok: true };
}
