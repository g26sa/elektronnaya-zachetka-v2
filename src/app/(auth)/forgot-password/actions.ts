"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generatePassword, sendMail } from "@/lib/mailer";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

export type ForgotState = {
  status?: "idle" | "ok" | "error";
  message?: string;
};

export async function requestPasswordReset(_: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message || "Некорректные данные" };
  }
  const email = parsed.data.email.toLowerCase();

  // Не раскрываем, существует ли учётка — всегда отвечаем одинаково.
  // Но если пользователь существует и активен — действительно сбрасываем пароль.
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const newPassword = generatePassword(10);
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await audit({
      userId: user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      before: { passwordReset: false },
      after: { passwordReset: true, by: "forgot-password" },
    });

    await sendMail({
      to: user.email,
      subject: "Восстановление пароля — Электронная зачётная книжка",
      text:
        `Здравствуйте, ${user.fullName}.\n\n` +
        `Для вашей учётной записи был сгенерирован новый пароль:\n\n` +
        `   ${newPassword}\n\n` +
        `Войдите с этим паролем и при необходимости измените его в личном кабинете.\n` +
        `Если вы не запрашивали восстановление, обратитесь к заведующему отделением.\n`,
      html:
        `<p>Здравствуйте, ${user.fullName}.</p>` +
        `<p>Для вашей учётной записи был сгенерирован новый пароль:</p>` +
        `<p style="font-family:monospace;font-size:18px;background:#f3f4f6;padding:12px;border-radius:4px;letter-spacing:2px"><strong>${newPassword}</strong></p>` +
        `<p>Войдите с этим паролем и при необходимости измените его в личном кабинете.</p>` +
        `<p style="color:#6b7280">Если вы не запрашивали восстановление, обратитесь к заведующему отделением.</p>`,
    });
  }

  return {
    status: "ok",
    message:
      "Если такой email зарегистрирован в системе, на него отправлен новый пароль. Проверьте почту (включая спам).",
  };
}
