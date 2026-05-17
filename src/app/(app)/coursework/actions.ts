"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { courseWorkSchema } from "@/schemas/coursework";

export async function createCourseWork(input: unknown) {
  const session = await getSession();
  assertCan(session, "courseWork:create");
  const d = courseWorkSchema.parse(input);
  const created = await prisma.courseWork.create({
    data: { ...d, date: new Date(d.date) },
  });
  await audit({ userId: session.userId, action: "CREATE", entity: "CourseWork", entityId: created.id, after: created });
  revalidatePath("/coursework");
}

export async function updateCourseWork(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "courseWork:edit");
  const d = courseWorkSchema.parse(input);
  const before = await prisma.courseWork.findUnique({ where: { id } });
  const updated = await prisma.courseWork.update({
    where: { id },
    data: { ...d, date: new Date(d.date) },
  });
  await audit({ userId: session.userId, action: "UPDATE", entity: "CourseWork", entityId: id, before, after: updated });
  revalidatePath("/coursework");
}

export async function deleteCourseWork(id: string) {
  const session = await getSession();
  if (!can(session, "courseWork:delete")) throw new Error("Нет прав");
  const before = await prisma.courseWork.findUnique({ where: { id } });
  await prisma.courseWork.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "CourseWork", entityId: id, before });
  revalidatePath("/coursework");
}
