"use server";

import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { findUserIdByResetToken, markResetTokenUsed } from "@/lib/passwordReset";

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Минимум 8 символов"),
    passwordConfirm: z.string().min(1, "Подтвердите пароль"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export type ResetState = { error?: string; ok?: boolean };

export async function completePasswordReset(_: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Проверьте поля" };
  }

  const userId = await findUserIdByResetToken(parsed.data.token);
  if (!userId) {
    return { error: "Ссылка недействительна или устарела. Запросите сброс ещё раз." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive) {
    return { error: "Учётная запись недоступна. Обратитесь к заведующему отделением." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await markResetTokenUsed(parsed.data.token);
  await audit({
    userId,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    after: { passwordResetCompleted: true },
  });

  return { ok: true };
}
