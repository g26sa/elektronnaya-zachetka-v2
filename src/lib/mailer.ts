import nodemailer, { type Transporter } from "nodemailer";

/**
 * Лениво создаёт SMTP-транспорт из переменных окружения.
 * Если SMTP_HOST не задан — возвращает null, и mailer работает в dev-режиме
 * (письма не отправляются, содержимое пишется в консоль).
 */
let cached: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = null;
    return null;
  }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });
  return cached;
}

export type SendMailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(params: SendMailParams): Promise<{ ok: boolean; reason?: string }> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || "noreply@example.com";

  if (!transport) {
    // Dev / демо: SMTP не настроен — выводим письмо в консоль,
    // чтобы ссылка/пароль были видны разработчику.
    console.log("\n──────── [MAIL — SMTP не настроен, письмо не отправлено] ────────");
    console.log("From:    ", from);
    console.log("To:      ", params.to);
    console.log("Subject: ", params.subject);
    console.log("Body:\n" + params.text);
    console.log("──────────────────────────────────────────────────────────────────\n");
    return { ok: false, reason: "smtp_not_configured" };
  }

  try {
    await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (e) {
    // Подстраховка: если SMTP вернул ошибку — продублируем содержимое в консоль,
    // чтобы сгенерированный пароль не терялся, пока администратор чинит SMTP.
    console.error("[MAIL] Ошибка отправки:", e instanceof Error ? e.message : e);
    console.log("\n──────── [MAIL — fallback: SMTP отказал, письмо в консоль] ────────");
    console.log("From:    ", from);
    console.log("To:      ", params.to);
    console.log("Subject: ", params.subject);
    console.log("Body:\n" + params.text);
    console.log("──────────────────────────────────────────────────────────────────\n");
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Генерирует криптостойкий случайный пароль из заданного алфавита.
 */
export function generatePassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  // node:crypto
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomFillSync } = require("node:crypto") as typeof import("node:crypto");
  randomFillSync(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
