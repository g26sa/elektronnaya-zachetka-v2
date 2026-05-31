"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Введите название"),
  isActive: z.coerce.boolean().optional(),
});

export async function saveDisciplineType(input: unknown) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const d = schema.parse(input);
  const data = { name: d.name, isActive: d.isActive ?? true };
  if (d.id) {
    const before = await (prisma as any).disciplineType.findUnique({ where: { id: d.id } });
    const updated = await (prisma as any).disciplineType.update({ where: { id: d.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "DisciplineType", entityId: d.id, before, after: updated });
  } else {
    const created = await (prisma as any).disciplineType.create({ data });
    await audit({ userId: session.userId, action: "CREATE", entity: "DisciplineType", entityId: created.id, after: created });
  }
  revalidatePath("/discipline-types");
}

export async function deleteDisciplineType(id: string) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const before = await (prisma as any).disciplineType.findUnique({ where: { id } });
  await (prisma as any).disciplineType.delete({ where: { id } });
  await audit({ userId: session.userId, action: "DELETE", entity: "DisciplineType", entityId: id, before });
  revalidatePath("/discipline-types");
}
