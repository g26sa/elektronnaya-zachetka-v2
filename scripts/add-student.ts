// Разовый скрипт: добавление студента.
// Запуск: npx tsx scripts/add-student.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "g2604sa@gmail.com";
  const password = "12345678";
  const fullName = "Студент (g2604sa)"; // отредактируйте в /users → «Карандаш»
  const groupName = "ИС-21";

  // 1. Группа — берём существующую или создаём
  let group = await prisma.group.findUnique({ where: { name: groupName } });
  if (!group) {
    group = await prisma.group.create({
      data: { name: groupName, speciality: "09.02.07 Информационные системы и программирование", startYear: 2023 },
    });
  }

  // 2. Идёмпотентность: если пользователь уже есть — только обновим пароль
  const existing = await prisma.user.findUnique({ where: { email }, include: { student: true } });
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, isActive: true } });
    if (!existing.student) {
      // Подберём свободный номер зачётной книжки
      const numbers = (await prisma.student.findMany({ select: { recordBookNumber: true } })).map((s) => s.recordBookNumber);
      let n = 4;
      let recordBookNumber = "";
      while (true) {
        recordBookNumber = `23-${String(n).padStart(3, "0")}`;
        if (!numbers.includes(recordBookNumber)) break;
        n++;
      }
      await prisma.student.create({
        data: {
          userId: existing.id,
          recordBookNumber,
          groupId: group.id,
          enrollmentDate: new Date("2023-09-01"),
          currentCourse: 1,
        },
      });
      console.log(`Существующему пользователю обновлён пароль, создан студент № ${recordBookNumber}`);
    } else {
      console.log("Пользователь уже существует — пароль обновлён.");
    }
  } else {
    const numbers = (await prisma.student.findMany({ select: { recordBookNumber: true } })).map((s) => s.recordBookNumber);
    let n = 4;
    let recordBookNumber = "";
    while (true) {
      recordBookNumber = `23-${String(n).padStart(3, "0")}`;
      if (!numbers.includes(recordBookNumber)) break;
      n++;
    }
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "STUDENT", fullName, isActive: true },
    });
    await prisma.student.create({
      data: {
        userId: user.id,
        recordBookNumber,
        groupId: group.id,
        enrollmentDate: new Date("2023-09-01"),
        currentCourse: 1,
      },
    });
    console.log(`Создан студент: ${email} (${fullName}), № зач. кн. ${recordBookNumber}, группа ${groupName}`);
  }

  console.log("Готово.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
