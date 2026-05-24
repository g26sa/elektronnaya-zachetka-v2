import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// Ожидаемые колонки Excel-шаблона:
// A: ФИО | B: Дата рождения (дд.мм.гггг) | C: № зачётной книжки
// D: Дата зачисления (дд.мм.гггг) | E: Приказ о зачислении | F: Курс
// G: Email (опц.) | H: Пароль (опц.)

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
    return XLSX.SSF.parse_date_code(val) ? new Date((val - 25569) * 86400 * 1000) : null;
  }
  if (typeof val === "string") {
    // дд.мм.гггг или yyyy-mm-dd
    const parts = val.includes(".") ? val.split(".").reverse() : val.split("-");
    if (parts.length === 3) {
      const d = new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HEAD") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const groupId = formData.get("groupId") as string | null;

    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    if (!groupId) return NextResponse.json({ error: "groupId не передан" }, { status: 400 });

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

    // Пропускаем заголовок (первую строку)
    const dataRows = rows.slice(1);

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const fullName = String(row[0] ?? "").trim();
      if (!fullName) continue;

      const birthDateRaw = row[1];
      const recordBookNumber = String(row[2] ?? "").trim();
      const enrollmentDateRaw = row[3];
      const enrollmentOrder = String(row[4] ?? "").trim() || null;
      const currentCourse = Number(row[5]) || 1;
      const emailRaw = String(row[6] ?? "").trim();
      const passwordRaw = String(row[7] ?? "").trim();

      if (!recordBookNumber) {
        errors.push(`Строка ${i + 2}: не указан № зачётной книжки`);
        continue;
      }

      const enrollmentDate = parseDate(enrollmentDateRaw);
      if (!enrollmentDate) {
        errors.push(`Строка ${i + 2} (${fullName}): неверная дата зачисления`);
        continue;
      }

      // Генерируем email если не указан
      const email = emailRaw || `${recordBookNumber.replace(/\s/g, "").toLowerCase()}@import.local`;
      const password = passwordRaw || Math.random().toString(36).slice(-8);

      try {
        // Проверяем дубли
        const dupBook = await prisma.student.findUnique({ where: { recordBookNumber } });
        if (dupBook) { skipped.push(`${fullName} (дубль № ${recordBookNumber})`); continue; }

        const dupEmail = await prisma.user.findUnique({ where: { email } });
        if (dupEmail) { skipped.push(`${fullName} (дубль email ${email})`); continue; }

        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
          data: { email, passwordHash, role: "STUDENT", fullName, isActive: true },
        });
        const student = await prisma.student.create({
          data: {
            userId: user.id,
            recordBookNumber,
            groupId,
            birthDate: parseDate(birthDateRaw),
            enrollmentDate,
            enrollmentOrder,
            currentCourse,
          },
        });
        await audit({
          userId: session.userId,
          action: "CREATE",
          entity: "Student",
          entityId: student.id,
          after: { fullName, recordBookNumber, groupId },
        });
        created.push(fullName);
      } catch (e) {
        errors.push(`Строка ${i + 2} (${fullName}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    revalidatePath("/students");
    revalidatePath("/groups");

    return NextResponse.json({ created: created.length, skipped, errors });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
