"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { courseWorkSchema } from "@/schemas/coursework";

function buildData(d: ReturnType<typeof courseWorkSchema.parse>, teacherId: string) {
  return {
    studentId: d.studentId,
    semesterId: d.semesterId,
    disciplineId: d.disciplineId,
    topic: d.topic,
    grade: d.grade ? d.grade : null,
    date: d.date ? new Date(d.date) : null,
    assignedAt: d.assignedAt ? new Date(d.assignedAt) : null,
    teacherId,
  };
}

export async function createCourseWork(input: unknown) {
  const session = await getSession();
  assertCan(session, "courseWork:create");
  const d = courseWorkSchema.parse(input);
  const teacherId = session.role === "TEACHER" ? session.userId : d.teacherId;
  const data = buildData(d, teacherId);
  // Если выдают только тему (без оценки) и не указали дату выдачи — ставим сегодня
  if (!data.grade && !data.assignedAt) data.assignedAt = new Date();
  const created = await prisma.courseWork.create({ data });
  await audit({ userId: session.userId, action: "CREATE", entity: "CourseWork", entityId: created.id, after: created });
  revalidatePath("/coursework");
}

export async function updateCourseWork(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "courseWork:edit");
  const d = courseWorkSchema.parse(input);
  const before = await prisma.courseWork.findUnique({ where: { id } });
  if (session.role === "TEACHER" && before && before.teacherId !== session.userId) {
    throw new Error("Можно редактировать только собственные курсовые");
  }
  const teacherId = session.role === "TEACHER" ? session.userId : d.teacherId;
  const updated = await prisma.courseWork.update({
    where: { id },
    data: buildData(d, teacherId),
  });
  await audit({ userId: session.userId, action: "UPDATE", entity: "CourseWork", entityId: id, before, after: updated });
  revalidatePath("/coursework");
}

export async function deleteCourseWork(id: string) {
  const session = await getSession();
  if (!can(session, "courseWork:delete")) throw new Error("Нет прав");
  const before = await prisma.courseWork.findUnique({ where: { id } });
  if (session!.role === "TEACHER" && before && before.teacherId !== session!.userId) {
    throw new Error("Можно удалять только собственные курсовые");
  }
  await prisma.courseWork.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "CourseWork", entityId: id, before });
  revalidatePath("/coursework");
}
