import { notFound, redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/types/enums";

/** Студент может печатать только свой профиль. */
export async function assertStudentMayPrint(session: SessionPayload, studentId: string) {
  if (session.role !== "STUDENT") return;
  const me = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!me || me.id !== studentId) notFound();
}

export async function resolveOwnStudentId(session: SessionPayload): Promise<string> {
  const me = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!me) notFound();
  return me.id;
}

/** Доступ к сводным отчётам: TEACHER, HEAD или STUDENT (только свои записи). */
export async function requireReportSession(): Promise<SessionPayload> {
  const { requireSession } = await import("@/lib/auth");
  const session = await requireSession();
  const allowed: Role[] = ["TEACHER", "HEAD", "STUDENT"];
  if (!allowed.includes(session.role)) redirect("/dashboard");
  return session;
}
