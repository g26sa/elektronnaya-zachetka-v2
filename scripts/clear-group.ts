import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const groupName = "246";

  const group = await prisma.group.findFirst({ where: { name: groupName } });
  if (!group) {
    console.log(`Группа «${groupName}» не найдена.`);
    return;
  }

  const students = await prisma.student.findMany({
    where: { groupId: group.id },
    select: { id: true, userId: true, recordBookNumber: true, user: { select: { fullName: true } } },
  });

  if (students.length === 0) {
    console.log(`В группе «${groupName}» нет студентов.`);
    return;
  }

  console.log(`Найдено студентов: ${students.length}`);
  students.forEach((s) => console.log(`  - ${s.user.fullName} (№ ${s.recordBookNumber})`));

  const userIds = students.map((s) => s.userId);
  const result = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`\nУдалено пользователей: ${result.count}`);
  console.log("Готово.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
