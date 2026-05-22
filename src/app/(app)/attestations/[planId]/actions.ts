"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { AssessmentTypeValues } from "@/types/enums";

/**
 * Создание оценки в контексте плана: дисциплина/семестр/часы берутся
 * из плана преподавателя, преподавателю остаётся выбрать студента, тип, оценку, дату.
 */
const schema = z.object({
  planId: z.string().min(1),
  studentId: z.string().min(1, "Выберите студента"),
  type: z.enum(AssessmentTypeValues),
  grade: z.string().min(1, "Выберите оценку"),
  date: z.string().min(1, "Введите дату"),
});

export async function createAssessmentFromPlan(input: unknown) {
  const session = await getSession();
  assertCan(session, "assessment:create");
  const d = schema.parse(input);

  const plan = await prisma.teachingAssignment.findUnique({ where: { id: d.planId } });
  if (!plan) throw new Error("Назначение не найдено");
  if (plan.kind !== "ASSESSMENT") throw new Error("Назначение не для промежуточной аттестации");
  if (session.role === "TEACHER" && plan.teacherId !== session.userId) {
    throw new Error("Это назначение не ваше");
  }
  if (!plan.disciplineId || !plan.semesterId || !plan.groupId) {
    throw new Error("В плане не указаны дисциплина / семестр / группа");
  }

  // Проверяем что студент действительно в группе плана
  const student = await prisma.student.findUnique({ where: { id: d.studentId } });
  if (!student || student.groupId !== plan.groupId) {
    throw new Error("Студент не из группы этого плана");
  }

  const created = await prisma.assessment.create({
    data: {
      studentId: d.studentId,
      semesterId: plan.semesterId,
      disciplineId: plan.disciplineId,
      type: d.type,
      grade: d.grade,
      hours: plan.hours ?? null,
      date: new Date(d.date),
      teacherId: plan.teacherId,
    },
  });
  await audit({
    userId: session.userId, action: "CREATE", entity: "Assessment",
    entityId: created.id, after: created,
  });
  revalidatePath(`/attestations/${d.planId}`);
  revalidatePath("/attestations");
}
