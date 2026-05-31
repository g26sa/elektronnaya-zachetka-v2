/**
 * Перенос председателей ГЭК из Defense.chairId (User) в Defense.chairGekId (GekChair).
 * Запуск: npx tsx scripts/migrate-defense-chairs.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defenses = await prisma.defense.findMany({
    where: { chairGekId: null, chairId: { not: null } },
    include: { chair: true },
  });

  if (defenses.length === 0) {
    console.log("Записей для миграции нет.");
    return;
  }

  let updated = 0;
  for (const d of defenses) {
    const name = d.chair?.fullName;
    if (!name) continue;

    let gek = await prisma.gekChair.findFirst({ where: { fullName: name } });
    if (!gek) {
      gek = await prisma.gekChair.create({
        data: { fullName: name, position: "Председатель ГЭК", isActive: true },
      });
      console.log(`  + создан GekChair: ${name}`);
    }

    await prisma.defense.update({
      where: { id: d.id },
      data: { chairGekId: gek.id, chairId: null },
    });
    updated++;
    console.log(`  ✓ ${name}`);
  }

  console.log(`Мигрировано записей: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
