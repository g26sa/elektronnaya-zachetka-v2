import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const TTL_MS = 60 * 60 * 1000; // 1 час

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Создаёт токен, отменяет старые неиспользованные, возвращает ссылку для письма */
export async function createPasswordResetLink(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return `${appUrl()}/reset-password?token=${encodeURIComponent(raw)}`;
}

export async function findUserIdByResetToken(raw: string): Promise<string | null> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(raw) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row.userId;
}

export async function markResetTokenUsed(raw: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: { tokenHash: hashResetToken(raw), usedAt: null },
    data: { usedAt: new Date() },
  });
}
