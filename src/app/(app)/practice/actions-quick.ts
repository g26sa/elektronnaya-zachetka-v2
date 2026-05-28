"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";

async function ensureTeacherPlanAllows(teacherId: string, semesterId: string, groupId: string) {
  const plan = await prisma.teachingAssignment.findFirst({
    where: { teacherId, kind: "PRACTICE", semesterId, groupId },
  });
  if (!plan) throw new Error("В вашем плане нет практики для этой группы и семестра");
}

const groupSchema = z.object({
  semesterId: z.string().min(1, "Выберите семестр"),
  groupId: z.string().min(1, "Выберите группу"),
  kind: z.enum(["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]),
  place: z.string().optional().nullable(),
  startDate: z.string().min(1, "Дата начала"),
  endDate: z.string().min(1, "Дата окончания"),
});

const studentEditSchema = z.object({
  id: z.string().min(1),
  grade: z.string().optional().nullable(),
  gradeDate: z.string().optional().nullable(),
  place: z.string().optional().nullable(),
  orgSupervisorName: z.string().optional().nullable(),
  orgSupervisorPosition: z.string().optional().nullable(),
});

/** Создать практику для всех студентов группы (без оценок). */
export async function createPracticeForGroup(input: unknown): Promise<string | null> {
  const session = await getSession();
  assertCan(session, "practice:create");
  const d = groupSchema.parse(input);
  const teacherId = session.role === "TEACHER" ? session.userId : session.userId;
  if (session.role === "TEACHER") {
    await ensureTeacherPlanAllows(teacherId, d.semesterId, d.groupId);
  }

  const [sem, institution, groupStudents] = await Promise.all([
    prisma.semester.findUnique({ where: { id: d.semesterId } }),
    prisma.institution.findFirst(),
    prisma.student.findMany({
      where: { groupId: d.groupId },
      select: { id: true },
    }),
  ]);
  if (!sem) throw new Error("Семестр не найден");
  if (groupStudents.length === 0) throw new Error("В группе нет студентов");

  const defaultPlace =
    d.kind === "EDUCATIONAL"
      ? (institution?.name ?? institution?.shortName ?? "Учреждение")
      : (d.place?.trim() || "—");

  const existing = await prisma.practice.findMany({
    where: {
      semesterId: d.semesterId,
      kind: d.kind,
      instSupervisorId: teacherId,
      studentId: { in: groupStudents.map((s) => s.id) },
    },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((e) => e.studentId));

  let created = 0;
  let skipped = 0;

  for (const s of groupStudents) {
    if (existingIds.has(s.id)) {
      skipped++;
      continue;
    }
    const row = await prisma.practice.create({
      data: {
        studentId: s.id,
        semesterId: d.semesterId,
        course: sem.course,
        kind: d.kind,
        place: defaultPlace,
        startDate: new Date(d.startDate),
        endDate: new Date(d.endDate),
        grade: null,
        gradeDate: null,
        instSupervisorId: teacherId,
        orgSupervisorName: null,
        orgSupervisorPosition: null,
      },
    });
    await audit({
      userId: session.userId,
      action: "CREATE",
      entity: "Practice",
      entityId: row.id,
      after: row,
    });
    created++;
  }

  revalidatePath("/practice");
  if (created === 0) {
    return skipped > 0
      ? "У всех студентов группы уже есть практика этого вида в выбранном семестре."
      : null;
  }
  if (skipped > 0) {
    return `Создано записей: ${created}. Пропущено (уже есть): ${skipped}.`;
  }
  return `Создано записей: ${created}.`;
}

/** Индивидуально: оценка, дата оценки, место (не учебная), руководитель от организации. */
export async function updatePracticeStudent(input: unknown) {
  const session = await getSession();
  assertCan(session, "practice:create");
  const d = studentEditSchema.parse(input);
  const teacherId = session.role === "TEACHER" ? session.userId : null;

  const before = await prisma.practice.findUnique({ where: { id: d.id } });
  if (!before) throw new Error("Практика не найдена");
  if (teacherId && before.instSupervisorId !== teacherId) {
    throw new Error("Можно редактировать только собственные практики");
  }

  const place =
    before.kind === "EDUCATIONAL"
      ? before.place
      : (d.place?.trim() || before.place);

  const updated = await prisma.practice.update({
    where: { id: d.id },
    data: {
      grade: d.grade || null,
      gradeDate: d.gradeDate ? new Date(d.gradeDate) : null,
      place,
      orgSupervisorName:
        before.kind === "EDUCATIONAL" ? null : (d.orgSupervisorName ?? null),
      orgSupervisorPosition:
        before.kind === "EDUCATIONAL" ? null : (d.orgSupervisorPosition ?? null),
    },
  });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "Practice",
    entityId: d.id,
    before,
    after: updated,
  });
  revalidatePath("/practice");
}
