/**
 * Перенумерация зачётных книжек всех студентов: 00001, 00002, …
 * Порядок: дата зачисления, затем ФИО.
 *
 * Запуск: npx tsx scripts/renumber-record-books.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatRecordBookNumber } from "../src/lib/record-book-number";

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: { user: { select: { fullName: true } } },
    orderBy: [{ enrollmentDate: "asc" }, { user: { fullName: "asc" } }],
  });

  if (students.length === 0) {
    console.log("Студентов нет — перенумерация не требуется.");
    return;
  }

  console.log(`Перенумерация ${students.length} студент(ов)…`);

  const tempPrefix = "__renum__";
  for (let i = 0; i < students.length; i++) {
    await prisma.student.update({
      where: { id: students[i].id },
      data: { recordBookNumber: `${tempPrefix}${i}` },
    });
  }

  for (let i = 0; i < students.length; i++) {
    const num = formatRecordBookNumber(i + 1);
    const s = students[i];
    await prisma.student.update({
      where: { id: s.id },
      data: { recordBookNumber: num },
    });
    console.log(`  ${s.user.fullName}: ${num}`);
  }

  console.log("Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
