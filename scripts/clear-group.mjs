import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const groupName = "246";

const group = await prisma.group.findFirst({ where: { name: groupName } });
if (!group) {
  console.log(`Группа «${groupName}» не найдена.`);
  process.exit(0);
}

const students = await prisma.student.findMany({
  where: { groupId: group.id },
  select: {
    id: true,
    userId: true,
    recordBookNumber: true,
    user: { select: { fullName: true } },
  },
});

if (students.length === 0) {
  console.log(`В группе «${groupName}» нет студентов.`);
  process.exit(0);
}

console.log(`Найдено студентов в группе «${groupName}»: ${students.length}`);
students.forEach((s) => console.log(`  - ${s.user.fullName} (№ ${s.recordBookNumber})`));

const studentIds = students.map((s) => s.id);
const userIds = students.map((s) => s.userId);

// Обнуляем ссылки с onDelete: NoAction перед удалением
await prisma.teachingAssignment.updateMany({
  where: { studentId: { in: studentIds } },
  data: { studentId: null },
});
await prisma.auditLog.updateMany({
  where: { userId: { in: userIds } },
  data: { userId: null },
});
await prisma.stateExam.deleteMany({ where: { studentId: { in: studentIds } } });
await prisma.student.deleteMany({ where: { id: { in: studentIds } } });

const result = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

console.log(`\nУдалено: ${result.count}. Готово.`);
await prisma.$disconnect();
