import { prisma } from "@/lib/db";

/** Создаёт уведомление для пользователя (если userId не передан — ничего не делает). */
export async function notify(opts: {
  userId: string | null | undefined;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  if (!opts.userId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        title: opts.title,
        body: opts.body ?? null,
        link: opts.link ?? null,
      },
    });
  } catch (e) {
    // молча проглатываем — уведомление не критичная операция
    console.error("[notify] failed:", e instanceof Error ? e.message : e);
  }
}

/** Студентов проще искать через User.student связь */
export async function notifyStudent(opts: {
  studentId: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const s = await prisma.student.findUnique({
    where: { id: opts.studentId },
    select: { userId: true },
  });
  if (!s) return;
  await notify({ userId: s.userId, title: opts.title, body: opts.body, link: opts.link });
}
