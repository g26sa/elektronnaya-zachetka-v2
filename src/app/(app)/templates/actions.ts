"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Введите название"),
  description: z.string().optional(),
  content: z.string().min(1, "Шаблон не может быть пустым"),
  isActive: z.coerce.boolean().optional(),
});

export async function saveTemplate(input: unknown) {
  const session = await getSession();
  assertCan(session, "template:edit");
  const data = schema.parse(input);
  const before = await prisma.documentTemplate.findUnique({ where: { id: data.id } });
  const updated = await prisma.documentTemplate.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description ?? null,
      content: data.content,
      isActive: data.isActive ?? true,
      updatedById: session.userId,
      version: { increment: 1 },
    },
  });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "DocumentTemplate",
    entityId: data.id,
    before,
    after: updated,
  });
  revalidatePath("/templates");
  revalidatePath(`/templates/${data.id}`);
}
