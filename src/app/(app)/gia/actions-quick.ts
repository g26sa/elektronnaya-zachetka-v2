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
  /** Допуск к защите — задаётся научным руководителем во вкладке ВКР */
  admission: z.enum(["ADMITTED", "NOT_ADMITTED"]).optional().nullable(),
});

async function ensureTeacherCanManageVkr(teacherId: string, studentId: string) {
  const inPlan = await prisma.teachingAssignment.findFirst({
    where: { teacherId, kind: "VKR", studentId },
  });
  if (inPlan) return;

  const vkr = await prisma.vKR.findUnique({
    where: { studentId },
    select: { supervisorId: true },
  });
  if (vkr?.supervisorId === teacherId) return;

  throw new Error("Этот студент не назначен вам как научный руководитель ВКР");
}

async function syncDefenseAdmission(
  vkrId: string,
  admission: "ADMITTED" | "NOT_ADMITTED" | null | undefined
) {
  if (!admission) return;

  const existing = await prisma.defense.findUnique({ where: { vkrId } });
  const now = new Date();

  if (admission === "ADMITTED") {
    const admissionDate = existing?.admissionDate ?? now;
    if (existing) {
      await prisma.defense.update({
        where: { vkrId },
        data: {
          admission: "ADMITTED",
          admissionDate,
        },
      });
    } else {
      await prisma.defense.create({
        data: {
          vkrId,
          admission: "ADMITTED",
          admissionDate,
        },
      });
    }
    return;
  }

  if (existing) {
    await prisma.defense.update({
      where: { vkrId },
      data: {
        admission: "NOT_ADMITTED",
        admissionDate: null,
        date: null,
        grade: null,
      },
    });
  } else {
    await prisma.defense.create({
      data: {
        vkrId,
        admission: "NOT_ADMITTED",
        admissionDate: null,
      },
    });
  }
}

export async function saveVkrQuick(input: unknown) {
  const session = await getSession();
  assertCan(session, "vkr:edit");
  const d = schema.parse(input);
  if (session.role === "TEACHER") {
    await ensureTeacherCanManageVkr(session.userId, d.studentId);
  }

  const supervisorId = session.userId;
  const before = await prisma.vKR.findUnique({ where: { studentId: d.studentId } });
  const data = {
    topic: d.topic,
    type: d.type || null,
    approvedOrder: d.approvedOrder || null,
    approvedDate: d.approvedDate ? new Date(d.approvedDate) : null,
    supervisorId,
  };

  let vkrId: string;

  if (before) {
    const updated = await prisma.vKR.update({
      where: { studentId: d.studentId },
      data,
    });
    vkrId = updated.id;
    await audit({
      userId: session.userId,
      action: "UPDATE",
      entity: "VKR",
      entityId: before.id,
      before,
      after: updated,
    });
  } else {
    const created = await prisma.vKR.create({
      data: { studentId: d.studentId, ...data },
    });
    vkrId = created.id;
    await audit({
      userId: session.userId,
      action: "CREATE",
      entity: "VKR",
      entityId: created.id,
      after: created,
    });
    await notifyStudent({
      studentId: d.studentId,
      title: "Назначена тема ВКР",
      body: `«${d.topic}»`,
      link: "/gia",
    });
  }

  if (d.admission) {
    await syncDefenseAdmission(vkrId, d.admission);
  }

  revalidatePath("/gia");
  revalidatePath("/defense");
  revalidatePath("/dashboard");
}
