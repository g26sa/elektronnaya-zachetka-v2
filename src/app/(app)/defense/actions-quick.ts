"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  studentId: z.string().min(1, "Выберите студента"),
  date: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  chairName: z.string().optional().nullable(),
});

async function ensureTeacherCanManageDefense(teacherId: string, studentId: string) {
  const inPlan = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId,
      studentId,
      kind: { in: ["VKR", "DEFENSE_CHAIR"] },
    },
  });
  if (inPlan) return;

  const vkr = await prisma.vKR.findUnique({
    where: { studentId },
    select: { supervisorId: true },
  });
  if (vkr?.supervisorId === teacherId) return;

  throw new Error("Этот студент не назначен вам по плану защиты ВКР");
}

export async function saveDefenseQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "defense:edit");
  const d = schema.parse(input);
  if (session.role === "TEACHER") {
    await ensureTeacherCanManageDefense(session.userId, d.studentId);
  }

  const vkr = await prisma.vKR.findUnique({
    where: { studentId: d.studentId },
    include: { defense: true },
  });
  if (!vkr) {
    throw new Error("Сначала назначьте тему ВКР этому студенту");
  }
  if (!vkr.defense || vkr.defense.admission !== "ADMITTED") {
    throw new Error(
      "Допуск к защите задаётся во вкладке «ВКР». Укажите «Допущен» там — после этого студент появится здесь."
    );
  }

  let chairGekId: string | null = null;
  if (d.chairName) {
    const existing = await prisma.gekChair.findFirst({ where: { fullName: d.chairName } });
    chairGekId = existing?.id ?? null;
  }

  const before = vkr.defense;
  const data = {
    date: d.date ? new Date(d.date) : null,
    grade: d.grade || null,
    chairGekId,
    chairId: null,
  };

  const updated = await prisma.defense.update({
    where: { vkrId: vkr.id },
    data,
  });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "Defense",
    entityId: before.id,
    before,
    after: updated,
  });

  revalidatePath("/defense");
  revalidatePath("/gia");
  revalidatePath("/dashboard");
}
