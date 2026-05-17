"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { defenseSchema } from "@/schemas/vkr";

export async function upsertDefense(input: unknown) {
  const session = await getSession();
  assertCan(session, "defense:edit");
  const d = defenseSchema.parse(input);
  const before = await prisma.defense.findUnique({ where: { vkrId: d.vkrId } });
  const data = {
    admission: d.admission,
    admissionDate: d.admissionDate ? new Date(d.admissionDate) : null,
    date: d.date ? new Date(d.date) : null,
    grade: d.grade ?? null,
    chairId: d.chairId ?? null,
    protocolNumber: d.protocolNumber ?? null,
  };
  const result = before
    ? await prisma.defense.update({ where: { vkrId: d.vkrId }, data })
    : await prisma.defense.create({ data: { vkrId: d.vkrId, ...data } });
  await audit({ userId: session.userId, action: before ? "UPDATE" : "CREATE", entity: "Defense", entityId: result.id, before, after: result });
  revalidatePath("/defense");
}
