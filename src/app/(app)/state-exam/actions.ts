"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { stateExamSchema } from "@/schemas/vkr";

export async function createStateExam(input: unknown) {
  const session = await getSession();
  assertCan(session, "stateExam:edit");
  const d = stateExamSchema.parse(input);
  const created = await (prisma.stateExam.create as Function)({
    data: {
      studentId: d.studentId,
      name: d.name,
      admission: d.admission,
      admissionDate: d.admissionDate ? new Date(d.admissionDate) : null,
      date: d.date ? new Date(d.date) : null,
      grade: d.grade ?? null,
      chairGekId: (d as any).chairGekId ?? null,
      chairId: null,
      protocolNumber: d.protocolNumber ?? null,
    },
  });
  await audit({ userId: session.userId, action: "CREATE", entity: "StateExam", entityId: created.id, after: created });
  revalidatePath("/state-exam");
}

export async function updateStateExam(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "stateExam:edit");
  const d = stateExamSchema.parse(input);
  const before = await prisma.stateExam.findUnique({ where: { id } });
  const updated = await (prisma.stateExam.update as Function)({
    where: { id },
    data: {
      studentId: d.studentId,
      name: d.name,
      admission: d.admission,
      admissionDate: d.admissionDate ? new Date(d.admissionDate) : null,
      date: d.date ? new Date(d.date) : null,
      grade: d.grade ?? null,
      chairGekId: (d as any).chairGekId ?? null,
      chairId: null,
      protocolNumber: d.protocolNumber ?? null,
    },
  });
  await audit({ userId: session.userId, action: "UPDATE", entity: "StateExam", entityId: id, before, after: updated });
  revalidatePath("/state-exam");
}

export async function deleteStateExam(id: string) {
  const session = await getSession();
  if (!can(session, "stateExam:edit")) throw new Error("Нет прав");
  const before = await prisma.stateExam.findUnique({ where: { id } });
  await prisma.stateExam.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "StateExam", entityId: id, before });
  revalidatePath("/state-exam");
}
