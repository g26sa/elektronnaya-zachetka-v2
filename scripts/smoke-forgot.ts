// E2E-тест восстановления пароля: имитирует пользовательский flow.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword, sendMail } from "../src/lib/mailer";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = "student1@college.local";
  const oldPasswordWasDemo = await bcrypt.compare("demo1234", (await prisma.user.findUnique({ where: { email } }))!.passwordHash);
  console.log(`1. Старый пароль "demo1234" принимается: ${oldPasswordWasDemo ? "OK" : "FAIL"}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new Error("Пользователь не найден");

  const newPassword = generatePassword(10);
  console.log(`2. Сгенерирован новый пароль: ${newPassword}`);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log("3. Пароль обновлён в БД");

  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  const newAccepted = await bcrypt.compare(newPassword, updated!.passwordHash);
  const oldRejected = !(await bcrypt.compare("demo1234", updated!.passwordHash));
  console.log(`4. Новый пароль принимается: ${newAccepted ? "OK" : "FAIL"}`);
  console.log(`5. Старый пароль больше не принимается: ${oldRejected ? "OK" : "FAIL"}`);

  // Имитация отправки письма
  const mailResult = await sendMail({
    to: email,
    subject: "Восстановление пароля — тест",
    text: `Новый пароль: ${newPassword}`,
  });
  console.log(`6. Отправка письма: ${mailResult.ok ? "OK (отправлено через SMTP)" : `dev-режим (${mailResult.reason})`}`);

  // Восстанавливаем demo1234 для удобства
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("demo1234") } });
  console.log("7. Пароль возвращён к demo1234 для удобства разработки");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
