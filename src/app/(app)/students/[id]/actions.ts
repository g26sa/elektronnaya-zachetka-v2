"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { studentProfileSchema } from "@/schemas/student";

export async function updateStudentProfile(studentId: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "student:edit");
  const d = studentProfileSchema.parse(input);

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
  if (!student) throw new Error("Студент не найден");

  // User-данные
  const userData: Record<string, unknown> = {
    email: d.email.toLowerCase(),
    fullName: d.fullName,
    isActive: d.isActive ?? true,
  };
  if (d.newPassword && d.newPassword.length > 0) {
    userData.passwordHash = await hashPassword(d.newPassword);
  }

  await prisma.user.update({ where: { id: student.userId }, data: userData });

  // Student-данные
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      recordBookNumber: d.recordBookNumber,
      groupId: d.groupId,
      birthDate: d.birthDate ? new Date(d.birthDate) : null,
      enrollmentDate: new Date(d.enrollmentDate),
      enrollmentOrder: d.enrollmentOrder ?? null,
      expulsionDate: d.expulsionDate ? new Date(d.expulsionDate) : null,
      expulsionOrder: d.expulsionOrder ?? null,
      currentCourse: d.currentCourse,
    },
  });

  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "Student",
    entityId: studentId,
    before: { ...student, user: { ...student.user, passwordHash: "[hidden]" } },
    after: { ...updated, password: d.newPassword ? "[changed]" : "[unchanged]" },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

export async function deleteStudent(studentId: string) {
  const session = await getSession();
  assertCan(session, "student:edit");
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
  if (!student) return;
  // Каскадно удаляем студента (Assessment/CourseWork/Practice/VKR прицепится по схеме)
  await prisma.student.delete({ where: { id: studentId } });
  // и затем пользователя
  await prisma.user.delete({ where: { id: student.userId } });
  await audit({
    userId: session.userId, action: "DELETE", entity: "Student", entityId: studentId,
    before: { ...student, user: { ...student.user, passwordHash: "[hidden]" } },
  });
  revalidatePath("/students");
  redirect("/students");
}
