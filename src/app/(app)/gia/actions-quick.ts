"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notifyStudent } from "@/lib/notify";

const schema = z.object({
  studentId: z.string().min(1, "Выберите студента"),
  topic: z.string().min(1, "Введите тему"),
  type: z.string().optional().nullable(),
  approvedOrder: z.string().optional().nullable(),
  approvedDate: z.string().optional().nullable(),
});

async function ensureTeacherCanManageVkr(teacherId: string, studentId: string) {
  const ok = await prisma.teachingAssignment.findFirst({
    where: { teacherId, kind: "VKR", studentId },
  });
  if (!ok) throw new Error("Этот студент не назначен вам по плану ВКР");
}

export async function saveVkrQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "vkr:edit");
  const d = schema.parse(input);
  if (session.role === "TEACHER") {
    await ensureTeacherCanManageVkr(session.userId, d.studentId);
  }

  const supervisorId = session.userId; // препод сам — научный руководитель
  const before = await prisma.vKR.findUnique({ where: { studentId: d.studentId } });
  const data = {
    topic: d.topic,
    type: d.type || null,
    approvedOrder: d.approvedOrder || null,
    approvedDate: d.approvedDate ? new Date(d.approvedDate) : null,
    supervisorId,
  };

  if (before) {
    const updated = await prisma.vKR.update({ where: { studentId: d.studentId }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "VKR", entityId: before.id, before, after: updated });
  } else {
    const created = await prisma.vKR.create({ data: { studentId: d.studentId, ...data } });
    await audit({ userId: session.userId, action: "CREATE", entity: "VKR", entityId: created.id, after: created });
    // Уведомить студента о назначенной теме
    await notifyStudent({
      studentId: d.studentId,
      title: "Назначена тема ВКР",
      body: `«${d.topic}»`,
      link: "/gia",
    });
  }

  revalidatePath("/gia");
}
