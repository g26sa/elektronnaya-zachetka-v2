import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TEMPLATES } from "../src/lib/defaultTemplates";

const prisma = new PrismaClient();

async function main() {
  console.log("Сидинг базы данных…");

  // Очистка (для idempotency)
  await prisma.auditLog.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.courseWork.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.defense.deleteMany();
  await prisma.stateExam.deleteMany();
  await prisma.vKR.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.group.deleteMany();
  await prisma.institution.deleteMany();

  // 1. Учреждение
  const institution = await prisma.institution.create({
    data: {
      name: "Государственное автономное профессиональное образовательное учреждение «Колледж информационных технологий»",
      shortName: "ГАПОУ КИТ",
      city: "Москва",
      address: "г. Москва, ул. Примерная, д. 1",
      ogrn: "1027700000000",
      inn: "7700000000",
      headTitle: "Директор",
      headName: "Иванов Иван Иванович",
    },
  });

  // 2. Шаблоны документов
  for (const t of DEFAULT_TEMPLATES) {
    await prisma.documentTemplate.create({
      data: { code: t.code, name: t.name, description: t.description, content: t.content },
    });
  }

  // 3. Пользователи
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const head = await prisma.user.create({
    data: {
      email: "head@college.local",
      passwordHash,
      role: "HEAD",
      fullName: "Иванов Иван Иванович",
      position: "Заведующий отделением информационных технологий",
    },
  });

  const teacher1 = await prisma.user.create({
    data: { email: "teacher1@college.local", passwordHash, role: "TEACHER", fullName: "Петрова Мария Сергеевна", position: "Доцент" },
  });
  const teacher2 = await prisma.user.create({
    data: { email: "teacher2@college.local", passwordHash, role: "TEACHER", fullName: "Сидоров Сергей Викторович", position: "Старший преподаватель" },
  });
  const teacher3 = await prisma.user.create({
    data: { email: "teacher3@college.local", passwordHash, role: "TEACHER", fullName: "Кузнецова Анна Дмитриевна", position: "Преподаватель" },
  });

  // 4. Группа
  const group = await prisma.group.create({
    data: { name: "ИС-21", speciality: "09.02.07 Информационные системы и программирование", startYear: 2023 },
  });

  // 5. Дисциплины
  const disc = await Promise.all([
    prisma.discipline.create({ data: { name: "Математика", totalHours: 144, creditUnits: 4 } }),
    prisma.discipline.create({ data: { name: "Программирование", totalHours: 180, creditUnits: 5 } }),
    prisma.discipline.create({ data: { name: "Базы данных", totalHours: 108, creditUnits: 3 } }),
    prisma.discipline.create({ data: { name: "Иностранный язык", totalHours: 72, creditUnits: 2 } }),
    prisma.discipline.create({ data: { name: "Операционные системы", totalHours: 108, creditUnits: 3 } }),
  ]);

  // 6. Семестры
  const sem1 = await prisma.semester.create({
    data: { course: 1, number: 1, academicYear: "2023/2024", startDate: new Date("2023-09-01"), endDate: new Date("2024-01-25") },
  });
  const sem2 = await prisma.semester.create({
    data: { course: 1, number: 2, academicYear: "2023/2024", startDate: new Date("2024-02-10"), endDate: new Date("2024-06-30") },
  });
  const sem3 = await prisma.semester.create({
    data: { course: 2, number: 1, academicYear: "2024/2025", startDate: new Date("2024-09-01"), endDate: new Date("2025-01-25") },
  });

  // 7. Студенты
  const studentDefs = [
    { email: "student1@college.local", fullName: "Алексеев Алексей Алексеевич", num: "23-001" },
    { email: "student2@college.local", fullName: "Беляева Ольга Николаевна",   num: "23-002" },
    { email: "student3@college.local", fullName: "Волков Дмитрий Андреевич",   num: "23-003" },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const u = await prisma.user.create({ data: { email: sd.email, passwordHash, role: "STUDENT", fullName: sd.fullName } });
    const s = await prisma.student.create({
      data: {
        userId: u.id, recordBookNumber: sd.num, groupId: group.id,
        birthDate: new Date("2005-05-15"), enrollmentDate: new Date("2023-09-01"),
        enrollmentOrder: "Приказ № 245-у от 28.08.2023", currentCourse: 2,
      },
    });
    students.push({ user: u, student: s });
  }

  // 8. Оценки: первый студент — все хорошо, второй — задолженность, третий — частично
  const [s1, s2, s3] = students;

  // Сем 1 — все 5 дисциплин у всех
  const allSem1 = [
    { d: disc[0], t: teacher1.id, type: "EXAM" as const,           hours: 144, ce: 4 },
    { d: disc[1], t: teacher2.id, type: "EXAM" as const,           hours: 180, ce: 5 },
    { d: disc[2], t: teacher2.id, type: "GRADED_CREDIT" as const,  hours: 108, ce: 3 },
    { d: disc[3], t: teacher3.id, type: "CREDIT" as const,         hours: 72,  ce: 2 },
    { d: disc[4], t: teacher2.id, type: "GRADED_CREDIT" as const,  hours: 108, ce: 3 },
  ];

  for (const a of allSem1) {
    await prisma.assessment.create({
      data: {
        studentId: s1.student.id, semesterId: sem1.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : "5",
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-01-20"), teacherId: a.t, protocolNumber: "В-1/01",
      },
    });
    await prisma.assessment.create({
      data: {
        studentId: s2.student.id, semesterId: sem1.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : (a.d.id === disc[0].id ? "2" : "4"),
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-01-20"), teacherId: a.t, protocolNumber: "В-1/01",
      },
    });
    await prisma.assessment.create({
      data: {
        studentId: s3.student.id, semesterId: sem1.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : "4",
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-01-20"), teacherId: a.t, protocolNumber: "В-1/01",
      },
    });
  }

  // Сем 2 — у первых двух всё, у третьего — частично (одной оценки нет)
  for (let i = 0; i < allSem1.length; i++) {
    const a = allSem1[i];
    if (i === 4 /* Операционные системы */) continue;  // у третьего пропустим
    await prisma.assessment.create({
      data: {
        studentId: s3.student.id, semesterId: sem2.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : "4",
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-06-20"), teacherId: a.t, protocolNumber: "В-2/06",
      },
    });
  }
  for (const a of allSem1) {
    await prisma.assessment.create({
      data: {
        studentId: s1.student.id, semesterId: sem2.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : "5",
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-06-20"), teacherId: a.t, protocolNumber: "В-2/06",
      },
    });
    await prisma.assessment.create({
      data: {
        studentId: s2.student.id, semesterId: sem2.id, disciplineId: a.d.id, type: a.type,
        grade: a.type === "CREDIT" ? "зачтено" : "4",
        hours: a.hours, creditUnits: a.ce,
        date: new Date("2024-06-20"), teacherId: a.t, protocolNumber: "В-2/06",
      },
    });
  }

  // 9. Курсовая работа у первого
  await prisma.courseWork.create({
    data: {
      studentId: s1.student.id, semesterId: sem3.id, disciplineId: disc[1].id,
      topic: "Разработка веб-приложения учёта успеваемости",
      grade: "5", date: new Date("2024-12-15"), teacherId: teacher2.id,
    },
  });

  // 10. Практика
  await prisma.practice.create({
    data: {
      studentId: s1.student.id, semesterId: sem2.id, course: 1, kind: "EDUCATIONAL",
      place: "ИТ-отдел колледжа",
      hours: 72, creditUnits: 2,
      startDate: new Date("2024-06-01"), endDate: new Date("2024-06-21"),
      grade: "5", gradeDate: new Date("2024-06-25"),
      instSupervisorId: teacher2.id,
      orgSupervisorName: "Смирнов Алексей Петрович", orgSupervisorPosition: "Начальник ИТ-отдела",
    },
  });

  // 11. ВКР + защита для первого студента
  const vkr = await prisma.vKR.create({
    data: {
      studentId: s1.student.id, topic: "Электронная зачётная книжка студента",
      approvedOrder: "Приказ № 132-в от 10.10.2024",
      approvedDate: new Date("2024-10-10"),
      supervisorId: teacher2.id,
    },
  });
  await prisma.defense.create({
    data: {
      vkrId: vkr.id, admission: "ADMITTED",
      admissionDate: new Date("2025-05-25"),
      date: new Date("2025-06-15"),
      grade: "5", chairId: head.id, protocolNumber: "ГЭК-1/2025",
    },
  });

  // 12. Гос. экзамен для первого
  await prisma.stateExam.create({
    data: {
      studentId: s1.student.id, name: "Государственный экзамен по специальности",
      admission: "ADMITTED", admissionDate: new Date("2025-05-25"),
      date: new Date("2025-06-05"), grade: "5",
      chairId: head.id, protocolNumber: "ГЭК-2/2025",
    },
  });

  console.log("Готово.");
  console.log("Демо-учётные записи (пароль для всех: demo1234):");
  console.log("  head@college.local      — заведующий отделением");
  console.log("  teacher1..3@college.local — преподаватели");
  console.log("  student1..3@college.local — студенты");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
