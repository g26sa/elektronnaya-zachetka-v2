import * as XLSX from "xlsx";
import { parseStudentsSheet } from "../src/lib/import-students-parse";

const ws: XLSX.WorkSheet = {};
ws["A1"] = { v: "Группа:", t: "s" };
ws["B1"] = { v: "246A", t: "s" };
ws["D1"] = { v: "№", t: "s" };
ws["E1"] = { v: "ФИО", t: "s" };
ws["F1"] = { v: "Email", t: "s" };
ws["G1"] = { v: "Дата рождения", t: "s" };
ws["H1"] = { v: "Приказ о зачислении", t: "s" };
ws["A2"] = { v: "Дата зачисления:", t: "s" };
ws["B2"] = { v: "31.08.2022", t: "s" };

const students = [
  [1, "Барышников Данил Максимович", "danil.baryshnikov@college.ru", "23.02.2006", "150-У"],
  [2, "Зигангиров Данил Сергеевич", "danil.zigangirov@college.ru", "11.07.2006", "159-У"],
  [3, "Исхаков Данил Делшатович", "danil.iskhakov@college.ru", "05.10.2006", "162-У"],
  [4, "Кругляк Никита Дмитриевич", "nikita.kruglyak@college.ru", "18.04.2006", "146-У"],
  [5, "Мавлютов Даниил Рафаилевич", "daniil.mavlyutov@college.ru", "27.12.2006", "173-У"],
  [6, "Ситдиков Эмиль Рустемович", "emil.sitdikov@college.ru", "09.06.2006", "154-У"],
  [7, "Смирнов Давид Эльшанович", "david.smirnov@college.ru", "14.09.2006", "167-У"],
  [8, "Сурменева Анастасия Дмитриевна", "anastasiya.surmeneva@college.ru", "02.03.2006", "141-У"],
  [9, "Хурамшина Диана Дамировна", "diana.khuramshina@college.ru", "20.11.2006", "170-У"],
];

students.forEach(([num, fio, email, birth, order], i) => {
  const row = i + 3;
  ws[`D${row}`] = { v: num, t: "n" };
  ws[`E${row}`] = { v: fio, t: "s" };
  ws[`F${row}`] = { v: email, t: "s" };
  ws[`G${row}`] = { v: birth, t: "s" };
  ws[`H${row}`] = { v: order, t: "s" };
});

ws["!ref"] = "A1:H10";
// 9-й студент в ячейках, но вне обрезанного !ref (типичный баг Excel)
ws["D11"] = { v: 9, t: "n" };
ws["E11"] = { v: "Хурамшина Диана Дамировна", t: "s" };
ws["F11"] = { v: "diana.khuramshina@college.ru", t: "s" };
ws["G11"] = { v: "20.11.2006", t: "s" };
ws["H11"] = { v: "170-У", t: "s" };

const result = parseStudentsSheet(ws);
if (!result.ok) {
  console.error("FAIL:", result.error, result.validationErrors);
  process.exit(1);
}

console.log("Найдено:", result.students.length);
result.students.forEach((s) => console.log(`  ${s.rowNum}: ${s.fullName}`));

if (result.students.length !== 9) process.exit(1);
if (result.students[0].fullName !== "Барышников Данил Максимович") process.exit(1);
console.log("OK");
