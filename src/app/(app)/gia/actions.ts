"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { vkrSchema } from "@/schemas/vkr";

export async function upsertVkr(input: unknown) {
  const session = await getSession();
  assertCan(session, "vkr:edit");
  const d = vkrSchema.parse(input);
  const before = await prisma.vKR.findUnique({ where: { studentId: d.studentId } });
  if (!before && session.role === "HEAD") {
    throw new Error("Заведующий может только редактировать существующие ВКР");
  }
  const data = {
    topic: d.topic,
    type: d.type ?? null,
    approvedOrder: d.approvedOrder ?? null,
    approvedDate: d.approvedDate ? new Date(d.approvedDate) : null,
    supervisorId: d.supervisorId,
  };
  const result = before
    ? await prisma.vKR.update({ where: { studentId: d.studentId }, data })
    : await prisma.vKR.create({ data: { studentId: d.studentId, ...data } });
  await audit({ userId: session.userId, action: before ? "UPDATE" : "CREATE", entity: "VKR", entityId: result.id, before, after: result });
  revalidatePath("/gia");
}
