// Сидинг стартовых значений для справочников: VkrType, GekChair.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const types = ["Дипломный проект", "Дипломная работа", "ВКР бакалавра", "ВКР магистра"];
  let i = 0;
  for (const name of types) {
    await prisma.vkrType.upsert({
      where: { name },
      update: { isActive: true, sortOrder: i },
      create: { name, isActive: true, sortOrder: i },
    });
    i++;
  }
  console.log(`✓ VkrType: ${types.length}`);

  const head = await prisma.user.findFirst({ where: { role: "HEAD" } });
  if (head) {
    const existing = await prisma.gekChair.findFirst({ where: { fullName: head.fullName } });
    if (!existing) {
      await prisma.gekChair.create({
        data: {
          fullName: head.fullName,
          position: head.position ?? "Председатель ГЭК",
          year: new Date().getFullYear(),
        },
      });
      console.log(`✓ GekChair: создан стартовый (${head.fullName})`);
    } else {
      console.log("✓ GekChair: уже есть запись");
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
