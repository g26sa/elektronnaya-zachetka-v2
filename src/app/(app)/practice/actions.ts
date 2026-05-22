"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { practiceSchema } from "@/schemas/practice";

function buildData(d: ReturnType<typeof practiceSchema.parse>, instSupervisorId: string) {
  return {
    studentId: d.studentId,
    semesterId: d.semesterId,
    course: d.course,
    kind: d.kind,
    place: d.place,
    hours: d.hours ?? null,
    creditUnits: d.creditUnits ?? null,
    startDate: new Date(d.startDate),
    endDate: new Date(d.endDate),
    grade: d.grade || null,
    gradeDate: d.gradeDate ? new Date(d.gradeDate) : null,
    instSupervisorId,
    // Для учебной практики руководитель от организации не нужен
    orgSupervisorName: d.kind === "EDUCATIONAL" ? null : (d.orgSupervisorName ?? null),
    orgSupervisorPosition: d.kind === "EDUCATIONAL" ? null : (d.orgSupervisorPosition ?? null),
  };
}

export async function createPractice(input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:create");
  const d = practiceSchema.parse(input);
  const instSupervisorId = session.role === "TEACHER" ? session.userId : d.instSupervisorId;
  const created = await prisma.practice.create({ data: buildData(d, instSupervisorId) });
  await audit({ userId: session.userId, action: "CREATE", entity: "Practice", entityId: created.id, after: created });
  revalidatePath("/practice");
}

export async function updatePractice(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:edit");
  const d = practiceSchema.parse(input);
  const before = await prisma.practice.findUnique({ where: { id } });
  if (session.role === "TEACHER" && before && before.instSupervisorId !== session.userId) {
    throw new Error("Можно редактировать только собственные практики");
  }
  const instSupervisorId = session.role === "TEACHER" ? session.userId : d.instSupervisorId;
  const updated = await prisma.practice.update({ where: { id }, data: buildData(d, instSupervisorId) });
  await audit({ userId: session.userId, action: "UPDATE", entity: "Practice", entityId: id, before, after: updated });
  revalidatePath("/practice");
}

export async function deletePractice(id: string) {
  const session = await getSession();
  if (!can(session, "practice:delete")) throw new Error("Нет прав");
  const before = await prisma.practice.findUnique({ where: { id } });
  if (session!.role === "TEACHER" && before && before.instSupervisorId !== session!.userId) {
    throw new Error("Можно удалять только собственные практики");
  }
  await prisma.practice.delete({ where: { id } });
  await audit({ userId: session!.userId, action: "DELETE", entity: "Practice", entityId: id, before });
  revalidatePath("/practice");
}
