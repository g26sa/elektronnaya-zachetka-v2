import * as XLSX from "xlsx";

export type ParsedStudentRow = {
  fullName: string;
  email: string;
  birthDate: Date;
  enrollmentOrder: string;
  rowNum: number;
};

export type ParseStudentsResult =
  | {
      ok: true;
      groupName: string;
      enrollmentDate: Date;
      defaultEnrollmentOrder: string | null;
      students: ParsedStudentRow[];
    }
  | { ok: false; error: string; validationErrors?: string[] };

function parseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number" && raw > 0) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const d = new Date(parsed.y, parsed.m - 1, parsed.d);
      return isNaN(d.getTime()) ? null : d;
    }
    const epoch = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(epoch.getTime()) ? null : epoch;
  }
  const s = String(raw).trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function cellStr(row: unknown[] | undefined, col: number): string {
  if (!row || col >= row.length) return "";
  const v = row[col];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Строка без данных студента (колонки D–H). */
function rowIsBlank(row: unknown[] | undefined): boolean {
  if (!row) return true;
  for (let c = 3; c <= 7; c++) {
    if (cellStr(row, c)) return false;
  }
  return true;
}

const HEADER_NAMES = new Set(["фио", "email", "e-mail", "№", "no", "n"]);

function looksLikeHeader(fullName: string, email: string): boolean {
  const n = fullName.toLowerCase();
  const e = email.toLowerCase();
  return HEADER_NAMES.has(n) || HEADER_NAMES.has(e) || n === "фио";
}

/** Расширяет !ref по фактически заполненным ячейкам (xlsx часто обрезает диапазон). */
function expandSheetRef(ws: XLSX.WorkSheet): XLSX.WorkSheet {
  let maxR = 0;
  let maxC = 0;
  for (const key of Object.keys(ws)) {
    if (key.startsWith("!")) continue;
    try {
      const { r, c } = XLSX.utils.decode_cell(key);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    } catch {
      /* ignore */
    }
  }
  if (maxR === 0 && maxC === 0) return ws;
  const expanded: XLSX.WorkSheet = { ...ws };
  expanded["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: maxR, c: Math.max(maxC, 7) },
  });
  return expanded;
}

/**
 * Читает лист построчно (надёжнее, чем ws["E3"] — не теряет строки за пределами !ref).
 * Колонки: D=№, E=ФИО, F=Email, G=дата рожд., H=приказ; B1=группа, B2=дата зачисления, D2=приказ группы.
 */
export function parseStudentsSheet(ws: XLSX.WorkSheet): ParseStudentsResult {
  const expanded = expandSheetRef(ws);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(expanded, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  const groupName = cellStr(matrix[0], 1);
  if (!groupName) {
    return { ok: false, error: "В ячейке B1 не указана группа" };
  }

  const enrollmentRaw = matrix[1]?.[1];
  if (!enrollmentRaw && enrollmentRaw !== 0) {
    return { ok: false, error: "В ячейке B2 не указана дата зачисления" };
  }
  const enrollmentDate = parseDate(enrollmentRaw);
  if (!enrollmentDate) {
    return { ok: false, error: "Неверный формат даты зачисления в B2" };
  }

  const defaultEnrollmentOrder =
    cellStr(matrix[1], 3) || cellStr(matrix[1], 7) || null;

  const students: ParsedStudentRow[] = [];
  const validationErrors: string[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const rowNum = i + 1;

    if (rowIsBlank(row)) continue;

    let fullName = cellStr(row, 4);
    const emailRaw = cellStr(row, 5);
    const birthDate = parseDate(row?.[6]);
    const enrollmentOrder =
      cellStr(row, 7) || defaultEnrollmentOrder || "";

    if (looksLikeHeader(fullName, emailRaw)) continue;

    if (!fullName && emailRaw) {
      const local = emailRaw.split("@")[0]?.replace(/[._]/g, " ").trim();
      if (local.length > 2) fullName = local;
    }

    if (!fullName) {
      validationErrors.push(`Строка ${rowNum}: не указано ФИО (колонка E)`);
      continue;
    }

    const missing: string[] = [];
    if (!emailRaw) missing.push("Email (F)");
    if (!birthDate) missing.push("Дата рождения (G)");
    if (!enrollmentOrder) missing.push("Приказ о зачислении (H или D2)");

    if (missing.length > 0 || !birthDate) {
      validationErrors.push(
        `Строка ${rowNum} («${fullName}»): не заполнены — ${missing.join(", ")}`
      );
      continue;
    }

    students.push({
      fullName,
      email: emailRaw.trim().toLowerCase(),
      birthDate,
      enrollmentOrder,
      rowNum,
    });
  }

  const emailsInFile = new Map<string, number>();
  for (const s of students) {
    const prev = emailsInFile.get(s.email);
    if (prev !== undefined) {
      validationErrors.push(
        `Email «${s.email}» повторяется в файле (строки ${prev} и ${s.rowNum})`
      );
    } else {
      emailsInFile.set(s.email, s.rowNum);
    }
  }

  if (validationErrors.length > 0) {
    return {
      ok: false,
      error: "Исправьте файл и загрузите снова:",
      validationErrors,
    };
  }

  if (students.length === 0) {
    return {
      ok: false,
      error: "Не найдено ни одного студента (с 3-й строки: колонки D–H)",
    };
  }

  return {
    ok: true,
    groupName,
    enrollmentDate,
    defaultEnrollmentOrder,
    students,
  };
}
