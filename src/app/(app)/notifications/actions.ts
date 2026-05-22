"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id, userId: session.userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
}
