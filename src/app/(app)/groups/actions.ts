"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { groupSchema } from "@/schemas/group";

export async function createGroup(input: unknown) {
  const session = await getSession();
  assertCan(session, "group:create");
  const d = groupSchema.parse(input);

  // Уникальность имени группы
  const dup = await prisma.group.findUnique({ where: { name: d.name } });
  if (dup) throw new Error(`Группа «${d.name}» уже существует`);

  const created = await prisma.group.create({
    data: {
      name: d.name,
      speciality: d.speciality ?? null,
      startYear: d.startYear,
    },
  });
  await audit({
    userId: session.userId,
    action: "CREATE",
    entity: "Group",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/groups");
  return { ok: true, id: created.id };
}

export async function updateGroup(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "group:edit");
  const d = groupSchema.parse(input);

  const before = await prisma.group.findUnique({ where: { id } });
  if (!before) throw new Error("Группа не найдена");

  // Если меняется имя — проверяем уникальность
  if (d.name !== before.name) {
    const dup = await prisma.group.findUnique({ where: { name: d.name } });
    if (dup) throw new Error(`Группа «${d.name}» уже существует`);
  }

  const updated = await prisma.group.update({
    where: { id },
    data: {
      name: d.name,
      speciality: d.speciality ?? null,
      startYear: d.startYear,
    },
  });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "Group",
    entityId: id,
    before,
    after: updated,
  });
  revalidatePath("/groups");
  return { ok: true };
}

export async function deleteGroup(id: string) {
  const session = await getSession();
  assertCan(session, "group:delete");

  const before = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!before) throw new Error("Группа не найдена");

  if (before._count.students > 0) {
    throw new Error(
      `Нельзя удалить группу «${before.name}» — в ней ${before._count.students} студент(ов). ` +
      `Сначала переведите их в другую группу или отчислите.`
    );
  }

  await prisma.group.delete({ where: { id } });
  await audit({
    userId: session.userId,
    action: "DELETE",
    entity: "Group",
    entityId: id,
    before,
  });
  revalidatePath("/groups");
  return { ok: true };
}
