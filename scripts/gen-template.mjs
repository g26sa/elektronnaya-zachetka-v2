/**
 * Генерирует шаблон импорта студентов и сохраняет в public/
 * Запуск: node scripts/gen-template.mjs
 */
import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";
import { writeFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "public", "shablon_importa_studentov.xlsx");

const wb = XLSX.utils.book_new();
const ws = {};

// ── Строка 1: название группы + заголовки столбцов ───────────────────
ws["A1"] = { v: "Группа:",            t: "s" };
ws["B1"] = { v: "",                   t: "s" };   // ← заведующий вписывает
ws["D1"] = { v: "№",                  t: "s" };
ws["E1"] = { v: "ФИО",                t: "s" };
ws["F1"] = { v: "Email",              t: "s" };
ws["G1"] = { v: "Дата рождения",      t: "s" };
ws["H1"] = { v: "Приказ о зачислении", t: "s" };

// ── Строка 2: дата зачисления + приказ ───────────────────────────────
ws["A2"] = { v: "Дата зачисления:",   t: "s" };
ws["B2"] = { v: "",                   t: "s" };   // ← дата, напр. 01.09.2024
ws["C2"] = { v: "Приказ о зачислении №:", t: "s" };
ws["D2"] = { v: "",                   t: "s" };   // ← общий приказ (если H пусто)

// ── Строки 3+: пример данных студентов ───────────────────────────────
const examples = [
  [1, "Иванов Иван Иванович",     "ivanov@example.com",  "15.03.2005", ""],
  [2, "Петрова Мария Сергеевна",  "petrova@example.com", "22.07.2005", ""],
  [3, "Сидоров Алексей Юрьевич", "sidorov@example.com", "01.11.2004", ""],
];
examples.forEach(([num, fio, email, birth, order], i) => {
  const row = i + 3;
  ws[`D${row}`] = { v: num,   t: "n" };
  ws[`E${row}`] = { v: fio,   t: "s" };
  ws[`F${row}`] = { v: email, t: "s" };
  ws[`G${row}`] = { v: birth, t: "s" };
  if (order) ws[`H${row}`] = { v: order, t: "s" };
});

ws["!ref"] = "A1:H5";
ws["!cols"] = [
  { wch: 22 },  // A
  { wch: 16 },  // B
  { wch: 26 },  // C
  { wch: 18 },  // D
  { wch: 35 },  // E ФИО
  { wch: 28 },  // F Email
  { wch: 16 },  // G Дата рождения
  { wch: 22 },  // H Приказ
];

XLSX.utils.book_append_sheet(wb, ws, "Студенты");

const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(outPath, buf);
console.log("Шаблон сохранён:", outPath);
