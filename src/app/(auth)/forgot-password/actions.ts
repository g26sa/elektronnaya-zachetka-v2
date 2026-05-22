"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mailer";
import { createPasswordResetLink } from "@/lib/passwordReset";

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

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.isActive) {
    const resetLink = await createPasswordResetLink(user.id);

    await audit({
      userId: user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      after: { passwordResetRequested: true },
    });

    await sendMail({
      to: user.email,
      subject: "Сброс пароля — Электронная зачётная книжка",
      text:
        `Здравствуйте, ${user.fullName}.\n\n` +
        `Чтобы задать новый пароль, перейдите по ссылке (действует 1 час):\n\n` +
        `${resetLink}\n\n` +
        `Если вы не запрашивали сброс — проигнорируйте письмо.\n`,
      html:
        `<p>Здравствуйте, ${user.fullName}.</p>` +
        `<p>Нажмите кнопку, чтобы задать новый пароль. Ссылка действует <strong>1 час</strong>.</p>` +
        `<p><a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Задать новый пароль</a></p>` +
        `<p style="color:#6b7280;font-size:12px">Если кнопка не открывается, скопируйте ссылку в браузер:<br>${resetLink}</p>` +
        `<p style="color:#6b7280">Не запрашивали сброс? Просто удалите это письмо.</p>`,
    });
  }

  return {
    status: "ok",
    message:
      "Если этот email есть в системе, мы отправили ссылку для сброса пароля. Проверьте почту и папку «Спам».",
  };
}
