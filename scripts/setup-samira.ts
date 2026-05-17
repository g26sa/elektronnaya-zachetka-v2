// Заполняет аккаунт Габдрахмановой Самиры Рустамовны:
// профиль, группа 246, 8 семестров, 40 оценок (положительные),
// 3 курсовые работы, ВКР с темой и руководителем.
//
// Скрипт идемпотентный — повторный запуск перезаписывает оценки/курсовые/ВКР этого студента.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "g2604sa@gmail.com";

async function main() {
  // ─── 1. Пользователь и студент ────────────────────────────────────────
  const passwordHash = await bcrypt.hash("12345678", 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { fullName: "Габдрахманова Самира Рустамовна", isActive: true, passwordHash },
    create: { email: EMAIL, fullName: "Габдрахманова Самира Рустамовна", role: "STUDENT", isActive: true, passwordHash },
  });

  const group = await prisma.group.upsert({
    where: { name: "246" },
    update: { speciality: "09.02.07 Информационные системы и программирование", startYear: 2022 },
    create: { name: "246", speciality: "09.02.07 Информационные системы и программирование", startYear: 2022 },
  });

  const existingStudent = await prisma.student.findUnique({ where: { userId: user.id } });
  const recordBookNumber = existingStudent?.recordBookNumber ?? "22-04";
  await prisma.student.upsert({
    where: { userId: user.id },
    update: {
      groupId: group.id,
      birthDate: new Date("2006-04-26"),
      enrollmentDate: new Date("2022-09-01"),
      enrollmentOrder: "Приказ № 178-у от 25.08.2022",
      currentCourse: 4,
      recordBookNumber,
    },
    create: {
      userId: user.id,
      recordBookNumber,
      groupId: group.id,
      birthDate: new Date("2006-04-26"),
      enrollmentDate: new Date("2022-09-01"),
      enrollmentOrder: "Приказ № 178-у от 25.08.2022",
      currentCourse: 4,
    },
  });
  const student = (await prisma.student.findUnique({ where: { userId: user.id } }))!;
  console.log(`✓ Студент: ${user.fullName} · группа ${group.name} · № ${student.recordBookNumber}`);

  // ─── 2. Преподаватели ────────────────────────────────────────────────
  const tHash = await bcrypt.hash("demo1234", 10);
  const fedotova = await prisma.user.upsert({
    where: { email: "fedotova@college.local" },
    update: { fullName: "Федотова Л. И.", role: "TEACHER", position: "Преподаватель" },
    create: { email: "fedotova@college.local", fullName: "Федотова Л. И.", role: "TEACHER", position: "Преподаватель", passwordHash: tHash },
  });
  const buzova = await prisma.user.upsert({
    where: { email: "buzova@college.local" },
    update: { fullName: "Бузова К. О.", role: "TEACHER", position: "Преподаватель" },
    create: { email: "buzova@college.local", fullName: "Бузова К. О.", role: "TEACHER", position: "Преподаватель", passwordHash: tHash },
  });
  console.log(`✓ Преподаватели: ${fedotova.fullName}, ${buzova.fullName}`);

  // ─── 3. Дисциплины (МДК) ─────────────────────────────────────────────
  const mdkCodes = ["МДК.11.01", "МДК.01.04", "МДК.02.01", "МДК.07.01", "МДК.08.02"];
  const mdks: Record<string, string> = {};
  for (const code of mdkCodes) {
    const d = await prisma.discipline.upsert({
      where: { name: code },
      update: {},
      create: { name: code, totalHours: 108, creditUnits: 3 },
    });
    mdks[code] = d.id;
  }

  // Базовые дисциплины уже засеяны (Математика, Программирование, Базы данных, Иностранный язык, Операционные системы)
  const baseDisciplines = await prisma.discipline.findMany({
    where: { name: { in: ["Математика", "Программирование", "Базы данных", "Иностранный язык", "Операционные системы"] } },
  });
  // Подстраховка — если seed не запускался, создадим базовые
  const baseSpecs = [
    { name: "Математика", totalHours: 144, creditUnits: 4 },
    { name: "Программирование", totalHours: 180, creditUnits: 5 },
    { name: "Базы данных", totalHours: 108, creditUnits: 3 },
    { name: "Иностранный язык", totalHours: 72, creditUnits: 2 },
    { name: "Операционные системы", totalHours: 108, creditUnits: 3 },
  ];
  for (const b of baseSpecs) {
    if (!baseDisciplines.find((d) => d.name === b.name)) {
      const d = await prisma.discipline.create({ data: b });
      baseDisciplines.push(d);
    }
  }
  const byName = (n: string) => baseDisciplines.find((d) => d.name === n)!;
  console.log(`✓ Дисциплин: базовых ${baseDisciplines.length}, МДК ${Object.keys(mdks).length}`);

  // ─── 4. Семестры (1–4 курс × 2 семестра) ─────────────────────────────
  type SemKey = { course: number; number: number; academicYear: string; startDate: Date; endDate: Date };
  const semSpecs: SemKey[] = [
    { course: 1, number: 1, academicYear: "2022/2023", startDate: new Date("2022-09-01"), endDate: new Date("2023-01-25") },
    { course: 1, number: 2, academicYear: "2022/2023", startDate: new Date("2023-02-10"), endDate: new Date("2023-06-30") },
    { course: 2, number: 1, academicYear: "2023/2024", startDate: new Date("2023-09-01"), endDate: new Date("2024-01-25") },
    { course: 2, number: 2, academicYear: "2023/2024", startDate: new Date("2024-02-10"), endDate: new Date("2024-06-30") },
    { course: 3, number: 1, academicYear: "2024/2025", startDate: new Date("2024-09-01"), endDate: new Date("2025-01-25") },
    { course: 3, number: 2, academicYear: "2024/2025", startDate: new Date("2025-02-10"), endDate: new Date("2025-06-30") },
    { course: 4, number: 1, academicYear: "2025/2026", startDate: new Date("2025-09-01"), endDate: new Date("2026-01-25") },
    { course: 4, number: 2, academicYear: "2025/2026", startDate: new Date("2026-02-10"), endDate: new Date("2026-06-30") },
  ];
  const semesters = [] as { id: string; spec: SemKey }[];
  for (const s of semSpecs) {
    const sem = await prisma.semester.upsert({
      where: { course_number_academicYear: { course: s.course, number: s.number, academicYear: s.academicYear } },
      update: { startDate: s.startDate, endDate: s.endDate },
      create: { ...s },
    });
    semesters.push({ id: sem.id, spec: s });
  }
  console.log(`✓ Семестров: ${semesters.length}`);

  // ─── 5. Чистим прошлые записи студента и заводим новые ────────────────
  await prisma.assessment.deleteMany({ where: { studentId: student.id } });
  await prisma.courseWork.deleteMany({ where: { studentId: student.id } });
  // VKR cascade удаляет Defense
  await prisma.vKR.deleteMany({ where: { studentId: student.id } });

  // ─── 6. 5 оценок в каждый семестр (5 дисциплин × 8 семестров = 40) ──
  const teachers = await prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } } });
  const teacherIds = teachers.map((t) => t.id);

  const examDisciplines = [
    { name: "Математика", type: "EXAM" as const, grade: "5" },
    { name: "Программирование", type: "EXAM" as const, grade: "5" },
    { name: "Базы данных", type: "GRADED_CREDIT" as const, grade: "5" },
    { name: "Иностранный язык", type: "CREDIT" as const, grade: "зачтено" },
    { name: "Операционные системы", type: "GRADED_CREDIT" as const, grade: "5" },
  ];
  let aCount = 0;
  for (const { id: semesterId, spec } of semesters) {
    const date = new Date(spec.endDate);
    date.setDate(date.getDate() - 5); // оценка чуть раньше конца семестра
    for (let i = 0; i < examDisciplines.length; i++) {
      const d = examDisciplines[i];
      await prisma.assessment.create({
        data: {
          studentId: student.id,
          semesterId,
          disciplineId: byName(d.name).id,
          type: d.type,
          grade: d.grade,
          hours: d.name === "Математика" ? 144 : d.name === "Программирование" ? 180 : 108,
          creditUnits: d.name === "Математика" ? 4 : d.name === "Программирование" ? 5 : d.name === "Иностранный язык" ? 2 : 3,
          date,
          teacherId: teacherIds[(i + spec.course) % teacherIds.length],
          protocolNumber: `В-${spec.course}.${spec.number}/${i + 1}`,
        },
      });
      aCount++;
    }
  }
  console.log(`✓ Аттестаций создано: ${aCount}`);

  // ─── 7. Курсовые работы ──────────────────────────────────────────────
  // Подбираем семестры по дате
  const findSem = (date: Date) => {
    return semesters.find((s) => date >= s.spec.startDate && date <= s.spec.endDate) ?? null;
  };
  const courseworks = [
    {
      topic: "Электронная зачётная книжка",
      disciplineCode: "МДК.11.01",
      grade: "5",
      date: new Date("2025-05-16"),
    },
    {
      topic: "Создание приложения для изучения иностранных слов с карточками",
      disciplineCode: "МДК.01.04",
      grade: "5",
      date: new Date("2025-10-30"),
    },
    {
      topic: "Проектирование и разработка базы данных «Финансовое планирование семьи»",
      disciplineCode: "МДК.02.01",
      grade: "5",
      date: new Date("2026-04-01"),
    },
  ];
  for (const cw of courseworks) {
    const sem = findSem(cw.date);
    if (!sem) throw new Error(`Не найден семестр для даты ${cw.date.toISOString()}`);
    await prisma.courseWork.create({
      data: {
        studentId: student.id,
        semesterId: sem.id,
        disciplineId: mdks[cw.disciplineCode],
        topic: cw.topic,
        grade: cw.grade,
        date: cw.date,
        teacherId: fedotova.id,
      },
    });
    console.log(`  · курсовая «${cw.topic.slice(0, 60)}» → ${sem.spec.course}к/${sem.spec.number}с`);
  }
  console.log(`✓ Курсовых: ${courseworks.length}`);

  // ─── 8. ВКР ──────────────────────────────────────────────────────────
  await prisma.vKR.create({
    data: {
      studentId: student.id,
      topic: "Проектирование и разработка веб-приложения «Электронная зачетная книжка»",
      type: "Дипломный проект",
      supervisorId: buzova.id,
      approvedOrder: "Приказ № 312-в от 15.10.2025",
      approvedDate: new Date("2025-10-15"),
    },
  });
  console.log(`✓ ВКР: тема и руководитель назначены`);

  await prisma.$disconnect();
  console.log("\nГотово.");
}

main().catch((e) => { console.error(e); process.exit(1); });
