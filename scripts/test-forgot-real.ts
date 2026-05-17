// Полный E2E: имитация формы "Забыли пароль" для g2604sa@gmail.com
// с реальной отправкой через настроенный SMTP.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword, sendMail } from "../src/lib/mailer";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = "g2604sa@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Студент не найден");

  const newPassword = generatePassword(10);
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const result = await sendMail({
    to: email,
    subject: "Восстановление пароля — Электронная зачётная книжка",
    text:
      `Здравствуйте, ${user.fullName}.\n\n` +
      `Для вашей учётной записи сгенерирован новый пароль:\n\n   ${newPassword}\n\n` +
      `Войдите с ним на странице /login и при необходимости измените в личном кабинете.\n`,
    html:
      `<p>Здравствуйте, ${user.fullName}.</p>` +
      `<p>Новый пароль для вашей учётной записи:</p>` +
      `<p style="font-family:monospace;font-size:18px;background:#f3f4f6;padding:12px;border-radius:4px;letter-spacing:2px"><strong>${newPassword}</strong></p>` +
      `<p>Войдите с ним и при необходимости измените в личном кабинете.</p>`,
  });

  console.log(`Email: ${email}`);
  console.log(`Сгенерированный пароль (на случай, если письмо не дойдёт): ${newPassword}`);
  console.log(`Отправка письма: ${result.ok ? "✅ OK" : `❌ ${result.reason}`}`);

  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  const matches = await bcrypt.compare(newPassword, updated!.passwordHash);
  console.log(`Новый пароль в БД: ${matches ? "OK (можно входить)" : "FAIL"}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
