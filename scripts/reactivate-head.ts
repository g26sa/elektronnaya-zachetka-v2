/**
 * Включает учётку заведующего (HEAD). Запуск: npx tsx scripts/reactivate-head.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const byRole = await prisma.user.updateMany({
    where: { role: "HEAD" },
    data: { isActive: true },
  });

  const head = await prisma.user.updateMany({
    where: { email: "head@college.local" },
    data: { isActive: true, role: "HEAD" },
  });

  const users = await prisma.user.findMany({
    where: { role: "HEAD" },
    select: { email: true, fullName: true, isActive: true },
  });

  console.log(`Обновлено по роли HEAD: ${byRole.count}, head@college.local: ${head.count}`);
  console.log("Заведующие в системе:");
  for (const u of users) {
    console.log(`  ${u.email} — ${u.fullName} — ${u.isActive ? "активен" : "отключён"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
