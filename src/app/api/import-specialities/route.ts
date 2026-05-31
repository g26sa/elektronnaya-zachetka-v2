import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !can(session, "group:create")) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "xlsm"].includes(ext ?? "")) {
      return NextResponse.json(
        { error: "Поддерживаются только .xlsx, .xls, .xlsm" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const ws = workbook.Sheets[workbook.SheetNames[0]];

    const names: string[] = [];
    const seen = new Set<string>();
    let row = 1;
    while (true) {
      const cell = ws[`A${row}`];
      const raw = cell?.v;
      if (raw === undefined || raw === null || String(raw).trim() === "") break;
      const name = String(raw).trim();
      const key = name.toLocaleLowerCase("ru");
      if (!seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
      row++;
      if (row > 10000) break;
    }

    if (names.length === 0) {
      return NextResponse.json(
        { error: "В столбце A не найдено ни одной специальности. Начните с ячейки A1." },
        { status: 422 }
      );
    }

    const existing = await (prisma as any).speciality.findMany({ select: { name: true } });
    const existingKeys = new Set(existing.map((s: { name: string }) => s.name.toLocaleLowerCase("ru")));
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (existingKeys.has(name.toLocaleLowerCase("ru"))) {
        skipped++;
        continue;
      }
      await (prisma as any).speciality.create({
        data: { name, isActive: true, sortOrder: i },
      });
      existingKeys.add(name.toLocaleLowerCase("ru"));
      created++;
    }

    return NextResponse.json({
      created,
      skipped,
      total: names.length,
      names,
    });
  } catch (e) {
    console.error("import-specialities error:", e);
    return NextResponse.json(
      { error: `Ошибка обработки файла: ${e instanceof Error ? e.message : "Неизвестная ошибка"}` },
      { status: 500 }
    );
  }
}
