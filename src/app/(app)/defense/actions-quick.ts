"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  studentId: z.string().min(1, "Выберите студента"),
  admission: z.enum(["ADMITTED", "NOT_ADMITTED"]),
  admissionDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  chairName: z.string().optional().nullable(),
});

async function ensureTeacherCanManageDefense(teacherId: string, studentId: string) {
  // Преподаватель ведёт защиту, если он либо научный руководитель ВКР этого студента,
  // либо назначен в план как DEFENSE_CHAIR
  const ok = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId,
      studentId,
      kind: { in: ["VKR", "DEFENSE_CHAIR"] },
    },
  });
  if (!ok) throw new Error("Этот студент не назначен вам по плану защиты ВКР");
}

export async function saveDefenseQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "defense:edit");
  const d = schema.parse(input);
  if (session.role === "TEACHER") {
    await ensureTeacherCanManageDefense(session.userId, d.studentId);
  }

  // Защита привязана к VKR, поэтому ВКР должна существовать
  const vkr = await prisma.vKR.findUnique({ where: { studentId: d.studentId } });
  if (!vkr) throw new Error("Сначала назначьте тему ВКР этому студенту");

  // Председатель ГЭК — храним имя как chair? У Defense есть chairId (User).
  // Чтобы сохранить «строкой» из справочника, сделаем поиск/создание User для имени
  // ИЛИ просто сохраним в protocolNumber. Лучше: ищем User с таким fullName, иначе оставляем null.
  let chairId: string | null = null;
  if (d.chairName) {
    const existing = await prisma.user.findFirst({ where: { fullName: d.chairName } });
    chairId = existing?.id ?? null;
  }

  const before = await prisma.defense.findUnique({ where: { vkrId: vkr.id } });
  const data = {
    admission: d.admission,
    admissionDate: d.admissionDate ? new Date(d.admissionDate) : null,
    date: d.date ? new Date(d.date) : null,
    grade: d.grade || null,
    chairId,
    protocolNumber: null as string | null,
  };
  if (before) {
    const updated = await prisma.defense.update({ where: { vkrId: vkr.id }, data });
    await audit({ userId: session.userId, action: "UPDATE", entity: "Defense", entityId: before.id, before, after: updated });
  } else {
    const created = await prisma.defense.create({ data: { vkrId: vkr.id, ...data } });
    await audit({ userId: session.userId, action: "CREATE", entity: "Defense", entityId: created.id, after: created });
  }

  revalidatePath("/defense");
}
