"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(1, "Введите ФИО"),
  position: z.string().optional().nullable(),
  year: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveGekChair(input: unknown) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const d = schema.parse(input);
  const data = {
    fullName: d.fullName,
    position: d.position || null,
    year: d.year ?? null,
    notes: d.notes || null,
    isActive: d.isActive ?? true,
  };
  if (d.id) {
    const before = await prisma.gekChair.findUnique({ where: { id: d.id } });
    const updated = await prisma.gekChair.update({ where: { id: d.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "GekChair", entityId: d.id, before, after: updated });
  } else {
    const created = await prisma.gekChair.create({ data });
    await audit({ userId: session.userId, action: "CREATE", entity: "GekChair", entityId: created.id, after: created });
  }
  revalidatePath("/gek-chairs");
}

export async function deleteGekChair(id: string) {
  const session = await getSession();
  assertCan(session, "reference:edit");
  const before = await prisma.gekChair.findUnique({ where: { id } });
  await prisma.gekChair.delete({ where: { id } });
  await audit({ userId: session.userId, action: "DELETE", entity: "GekChair", entityId: id, before });
  revalidatePath("/gek-chairs");
}
