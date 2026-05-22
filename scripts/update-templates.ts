// Обновляет шаблоны документов в БД содержимым из defaultTemplates.ts.
// Запуск: npx tsx scripts/update-templates.ts
import { PrismaClient } from "@prisma/client";
import { DEFAULT_TEMPLATES } from "../src/lib/defaultTemplates";

const prisma = new PrismaClient();

async function main() {
  for (const t of DEFAULT_TEMPLATES) {
    const existing = await prisma.documentTemplate.findUnique({ where: { code: t.code } });
    if (existing) {
      await prisma.documentTemplate.update({
        where: { code: t.code },
        data: { name: t.name, description: t.description, content: t.content, version: { increment: 1 } },
      });
      console.log(`updated: ${t.code} (v→${existing.version + 1})`);
    } else {
      await prisma.documentTemplate.create({ data: { code: t.code, name: t.name, description: t.description, content: t.content } });
      console.log(`created: ${t.code}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
