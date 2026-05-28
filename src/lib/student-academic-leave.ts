import { prisma } from "@/lib/db";

/** Локальная дата YYYY-MM-DD (для сравнения периодов отпуска). */
export function dateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocal(): string {
  return dateOnlyLocal(new Date());
}

export type AcademicLeaveFields = {
  academicLeaveDate: Date | null;
  academicLeaveEndDate: Date | null;
  academicLeaveOrder: string | null;
};

/** Студент сейчас в академическом отпуске (между началом и концом включительно). */
export function isOnAcademicLeave(fields: AcademicLeaveFields): boolean {
  const { academicLeaveDate, academicLeaveEndDate, academicLeaveOrder } = fields;
  if (!academicLeaveDate || !academicLeaveOrder) return false;

  const today = todayLocal();
  const start = dateOnlyLocal(academicLeaveDate);
  if (today < start) return false;

  if (academicLeaveEndDate) {
    const end = dateOnlyLocal(academicLeaveEndDate);
    if (today > end) return false;
  }

  return true;
}

/** Завершён академ. отпуск: указана дата окончания и она уже прошла. */
export function academicLeaveHasEnded(fields: AcademicLeaveFields): boolean {
  const { academicLeaveEndDate } = fields;
  if (!academicLeaveEndDate) return false;
  return todayLocal() > dateOnlyLocal(academicLeaveEndDate);
}

/**
 * Возвращает в активные студентов, у которых истёк академ. отпуск.
 * Вызывается при загрузке раздела «Студенты».
 */
export async function reactivateEndedAcademicLeaves(): Promise<number> {
  const today = todayLocal();
  const candidates = await prisma.student.findMany({
    where: {
      archiveReason: "ACADEMIC_LEAVE",
      academicLeaveEndDate: { not: null },
    },
    select: {
      id: true,
      userId: true,
      academicLeaveDate: true,
      academicLeaveEndDate: true,
      academicLeaveOrder: true,
    },
  });

  const toRestore = candidates.filter((s) =>
    s.academicLeaveEndDate && today > dateOnlyLocal(s.academicLeaveEndDate)
  );

  if (toRestore.length === 0) return 0;

  await prisma.$transaction(
    toRestore.flatMap((s) => [
      prisma.user.update({
        where: { id: s.userId },
        data: { isActive: true },
      }),
      prisma.student.update({
        where: { id: s.id },
        data: { archiveReason: null },
      }),
    ])
  );

  return toRestore.length;
}
