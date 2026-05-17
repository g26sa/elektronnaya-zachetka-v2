"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { practiceSchema } from "@/schemas/practice";

export async function createPractice(input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:create");
  const d = practiceSchema.parse(input);
  const created = await prisma.practice.create({
    data: {
      ...d,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      gradeDate: new Date(d.gradeDate),
      hours: d.hours ?? null,
      creditUnits: d.creditUnits ?? null,
      orgSupervisorName: d.orgSupervisorName ?? null,
      orgSupervisorPosition: d.orgSupervisorPosition ?? null,
    },
  });
  await audit({ userId: session.userId, action: "CREATE", entity: "Practice", entityId: created.id, after: created });
  revalidatePath("/practice");
}

export async function updatePractice(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:edit");
  const d = practiceSchema.parse(input);
  const before = await prisma.practice.findUnique({ where: { id } });
  const updated = await prisma.practice.update({
    where: { id },
    data: {
      ...d,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      gradeDate: new Date(d.gradeDate),
      hours: d.hours ?? null,
      creditUnits: d.creditUnits ?? null,
      orgSupervisorName: d.orgSupervisorName ?? null,
      orgSupervisorPosition: d.orgSupervisorPosition ?? null,
    },
  });
  await audit({ userId: session.userId, action: "UPDATE", entity: "Practice", entityId: id, before, after: updated });
  revalidatePath("/practice");
}

export async function deletePractice(id: string) {
  const session = await getSession();
  if (!can(session, "practice:delete")) throw new Error("Нет прав");
  const before = await prisma.practice.findUnique({ where: { id } });
  await prisma.practice.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "Practice", entityId: id, before });
  revalidatePath("/practice");
}
