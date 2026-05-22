"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notifyStudent } from "@/lib/notify";

/**
 * Создание/обновление курсовой преподавателем с упрощённой формой.
 * Дисциплина, группа, семестр доступны только из плана преподавателя (COURSEWORK).
 */
const schema = z.object({
  id: z.string().optional(),
  semesterId: z.string().min(1, "Выберите семестр"),
  disciplineId: z.string().min(1, "Выберите дисциплину"),
  groupId: z.string().min(1, "Выберите группу"),
  studentId: z.string().min(1, "Выберите студента"),
  topic: z.string().min(1, "Введите тему"),
  grade: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable(),
});

async function ensureTeacherPlanAllows(teacherId: string, disciplineId: string, semesterId: string, groupId: string) {
  const plan = await prisma.teachingAssignment.findFirst({
    where: { teacherId, kind: "COURSEWORK", disciplineId, semesterId, groupId },
  });
  if (!plan) throw new Error("В вашем плане нет такого назначения (дисциплина/семестр/группа)");
}

async function ensureStudentInGroup(studentId: string, groupId: string) {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!s || s.groupId !== groupId) throw new Error("Студент не из выбранной группы");
}

export async function saveCourseWorkQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "courseWork:create");
  const d = schema.parse(input);
  const teacherId = session.role === "TEACHER" ? session.userId : null;
  if (teacherId) {
    await ensureTeacherPlanAllows(teacherId, d.disciplineId, d.semesterId, d.groupId);
  }
  await ensureStudentInGroup(d.studentId, d.groupId);

  const data = {
    studentId: d.studentId,
    semesterId: d.semesterId,
    disciplineId: d.disciplineId,
    topic: d.topic,
    grade: d.grade || null,
    date: d.date ? new Date(d.date) : null,
    assignedAt: d.assignedAt ? new Date(d.assignedAt) : (!d.grade ? new Date() : null),
    teacherId: teacherId ?? session.userId,
  };

  if (d.id) {
    const before = await prisma.courseWork.findUnique({ where: { id: d.id } });
    if (teacherId && before && before.teacherId !== teacherId) {
      throw new Error("Можно редактировать только собственные курсовые");
    }
    const updated = await prisma.courseWork.update({ where: { id: d.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "CourseWork", entityId: d.id, before, after: updated });
  } else {
    const created = await prisma.courseWork.create({ data });
    await audit({ userId: session.userId, action: "CREATE", entity: "CourseWork", entityId: created.id, after: created });
    // Уведомить студента о выданной теме (только при создании без оценки)
    if (!data.grade) {
      await notifyStudent({
        studentId: d.studentId,
        title: "Назначена тема курсовой работы",
        body: `«${d.topic}»`,
        link: "/profile",
      });
    }
  }

  revalidatePath("/coursework");
}

