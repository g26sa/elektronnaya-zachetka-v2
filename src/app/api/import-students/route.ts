import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { parseStudentsSheet } from "@/lib/import-students-parse";

async function findGroupByName(name: string) {
  const trimmed = name.trim();
  const exact = await prisma.group.findFirst({ where: { name: trimmed } });
  if (exact) return exact;
  const all = await prisma.group.findMany();
  return (
    all.find((g) => g.name.localeCompare(trimmed, "ru", { sensitivity: "accent" }) === 0) ??
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "xlsm"].includes(ext ?? "")) {
      return NextResponse.json({ error: "Поддерживаются только .xlsx, .xls, .xlsm" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    const ws = workbook.Sheets[workbook.SheetNames[0]];

    const parsed = parseStudentsSheet(ws);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: parsed.error,
          validationErrors: parsed.validationErrors,
        },
        { status: parsed.validationErrors ? 422 : 400 }
      );
    }

    const { groupName, enrollmentDate, students } = parsed;

    const expectedGroupName = String(formData.get("expectedGroupName") ?? "").trim();
    if (
      expectedGroupName &&
      groupName.localeCompare(expectedGroupName, "ru", { sensitivity: "accent" }) !== 0
    ) {
      return NextResponse.json(
        {
          error: `В файле указана группа «${groupName}», но импорт открыт для группы «${expectedGroupName}». Проверьте ячейку B1.`,
          groupMismatch: true,
          fileGroup: groupName,
          expectedGroup: expectedGroupName,
        },
        { status: 422 }
      );
    }

    const group = await findGroupByName(groupName);
    if (!group) {
      return NextResponse.json(
        {
          error: `Группа «${groupName}» не найдена. Сначала добавьте её во вкладке «Группы».`,
          missingGroup: groupName,
        },
        { status: 422 }
      );
    }

    const digits = groupName.replace(/\D/g, "");
    const course = digits.length >= 2 ? parseInt(digits[1], 10) : 1;

    const speciality = group.speciality ?? "";
    const existingInSpeciality = await prisma.student.findMany({
      where: { group: { speciality: speciality || undefined } },
      select: { recordBookNumber: true },
    });
    let maxNum = 0;
    for (const s of existingInSpeciality) {
      const n = parseInt(s.recordBookNumber.replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const passwordHash = await bcrypt.hash("student", 10);

    for (const student of students) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: student.email },
          include: { student: true },
        });

        if (existingUser) {
          if (existingUser.role !== "STUDENT" || !existingUser.student) {
            skipped.push(
              `${student.fullName} — email занят не студентом (${student.email})`
            );
            continue;
          }

          const st = existingUser.student;
          if (st.groupId === group.id) {
            await prisma.student.update({
              where: { id: st.id },
              data: {
                birthDate: student.birthDate,
                enrollmentDate,
                enrollmentOrder: student.enrollmentOrder,
                currentCourse: course,
              },
            });
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { fullName: student.fullName },
            });
            updated.push(`${student.fullName} (№ ${st.recordBookNumber}) — обновлён`);
            continue;
          }

          await prisma.student.update({
            where: { id: st.id },
            data: {
              groupId: group.id,
              birthDate: student.birthDate,
              enrollmentDate,
              enrollmentOrder: student.enrollmentOrder,
              currentCourse: course,
            },
          });
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { fullName: student.fullName },
          });
          updated.push(
            `${student.fullName} (№ ${st.recordBookNumber}) — перенесён в группу ${group.name}`
          );
          continue;
        }

        maxNum += 1;
        const recordBookNumber = String(maxNum);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: student.email,
              fullName: student.fullName,
              passwordHash,
              role: "STUDENT",
              isActive: true,
            },
          });
          await tx.student.create({
            data: {
              userId: user.id,
              groupId: group.id,
              recordBookNumber,
              currentCourse: course,
              birthDate: student.birthDate,
              enrollmentDate,
              enrollmentOrder: student.enrollmentOrder,
            },
          });
        });

        created.push(`${student.fullName} (№ ${recordBookNumber})`);
      } catch (e) {
        errors.push(
          `Строка ${student.rowNum} («${student.fullName}»): ${e instanceof Error ? e.message : "Ошибка"}`
        );
      }
    }

    const imported = created.length + updated.length;
    const incomplete = imported < students.length;
    const parsedNames = students.map((s) => s.fullName);

    return NextResponse.json({
      created: created.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
      total: students.length,
      imported,
      incomplete,
      parsedNames,
      createdNames: created,
      updatedNames: updated,
      skippedNames: skipped,
      errorDetails: errors,
      group: group.name,
      enrollmentDate: enrollmentDate.toISOString().slice(0, 10),
      warning: incomplete
        ? `В файле ${students.length} студент(ов), обработано ${imported}. Проверьте пропущенные строки и ошибки.`
        : undefined,
    });
  } catch (e) {
    console.error("import-students error:", e);
    return NextResponse.json(
      {
        error: `Ошибка обработки файла: ${e instanceof Error ? e.message : "Неизвестная ошибка"}`,
      },
      { status: 500 }
    );
  }
}
