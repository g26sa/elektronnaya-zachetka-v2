// Тест нового token-based потока сброса пароля.
import { PrismaClient } from "@prisma/client";
import {
  createPasswordResetLink,
  findUserIdByResetToken,
  markResetTokenUsed,
} from "../src/lib/passwordReset";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { isActive: true } });
  if (!user) throw new Error("Нет активных пользователей");

  console.log("1. Создаю ссылку для:", user.email);
  const link = await createPasswordResetLink(user.id);
  const url = new URL(link);
  const token = url.searchParams.get("token");
  console.log("   Ссылка: ", link);
  console.log("   Токен: ", token?.slice(0, 16) + "…");

  console.log("2. Поиск userId по токену:");
  const foundId = await findUserIdByResetToken(token!);
  console.log("   →", foundId === user.id ? "OK (совпадает)" : "FAIL");

  console.log("3. Помечаю токен использованным");
  await markResetTokenUsed(token!);

  console.log("4. Повторный поиск (уже использован)");
  const foundAgain = await findUserIdByResetToken(token!);
  console.log("   →", foundAgain === null ? "OK (отклонён)" : "FAIL (всё ещё валиден!)");

  console.log("5. Несуществующий токен:");
  const fake = await findUserIdByResetToken("nonexistent_random_token_42");
  console.log("   →", fake === null ? "OK" : "FAIL");

  // Подчищаем тестовые записи
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  console.log("Подчистил тестовые записи.");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
