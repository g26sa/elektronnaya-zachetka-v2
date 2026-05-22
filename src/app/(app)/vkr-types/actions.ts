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
  sortOrder: z.coerce.number().int().optional(),
});

export async function saveVkrType(input: unknown) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const d = schema.parse(input);
  const data = { name: d.name, isActive: d.isActive ?? true, sortOrder: d.sortOrder ?? 0 };
  if (d.id) {
    const before = await prisma.vkrType.findUnique({ where: { id: d.id } });
    const updated = await prisma.vkrType.update({ where: { id: d.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "VkrType", entityId: d.id, before, after: updated });
  } else {
    const created = await prisma.vkrType.create({ data });
    await audit({ userId: session.userId, action: "CREATE", entity: "VkrType", entityId: created.id, after: created });
  }
  revalidatePath("/vkr-types");
}

export async function deleteVkrType(id: string) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const before = await prisma.vkrType.findUnique({ where: { id } });
  await prisma.vkrType.delete({ where: { id } });
  await audit({ userId: session.userId, action: "DELETE", entity: "VkrType", entityId: id, before });
  revalidatePath("/vkr-types");
}
