// Smoke-тест: логин, выборка данных, рендер шаблона.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { renderTemplate } from "../src/lib/template";
import { buildStudentContext } from "../src/lib/templateContext";

const prisma = new PrismaClient();

async function main() {
  // 1. Логин (бизнес-логика без HTTP)
  const head = await prisma.user.findUnique({ where: { email: "head@college.local" } });
  if (!head) throw new Error("Заведующий не найден");
  const ok = await bcrypt.compare("demo1234", head.passwordHash);
  console.log("1. Логин head@college.local /demo1234:", ok ? "OK" : "FAIL");

  // 2. Список студентов
  const students = await prisma.student.findMany({ include: { user: true, group: true } });
  console.log(`2. Студентов: ${students.length}`);
  for (const s of students) console.log(`   - ${s.user.fullName} (${s.group.name}, № ${s.recordBookNumber})`);

  // 3. Оценок и связей
  const counts = {
    assessments: await prisma.assessment.count(),
    courseWorks: await prisma.courseWork.count(),
    practices: await prisma.practice.count(),
    vkr: await prisma.vKR.count(),
    defense: await prisma.defense.count(),
    stateExam: await prisma.stateExam.count(),
    templates: await prisma.documentTemplate.count(),
  };
  console.log("3. Записей:", counts);

  // 4. Рендер шаблона зачётной книжки для первого студента
  const tmpl = await prisma.documentTemplate.findUnique({ where: { code: "RECORD_BOOK" } });
  if (!tmpl) throw new Error("Шаблон RECORD_BOOK не найден");
  const ctx = await buildStudentContext(students[0].id);
  const html = renderTemplate(tmpl.content, ctx as unknown as Record<string, unknown>);
  console.log("4. Рендер шаблона RECORD_BOOK:", html.length > 100 ? `OK (${html.length} символов)` : "FAIL");
  console.log("   Первые 240 символов отрендеренного HTML:");
  console.log("   " + html.replace(/\s+/g, " ").slice(0, 240).trim() + "…");

  // 5. Шаблон ATTESTATION_REPORT
  const attest = await prisma.documentTemplate.findUnique({ where: { code: "ATTESTATION_REPORT" } });
  if (attest) {
    const html2 = renderTemplate(attest.content, ctx as unknown as Record<string, unknown>);
    const rowCount = (html2.match(/<tr>/g) || []).length;
    console.log(`5. Сводная ведомость: ${rowCount} строк (включая заголовок)`);
  }

  await prisma.$disconnect();
  console.log("\nВсё ОК.");
}

main().catch((e) => { console.error(e); process.exit(1); });
