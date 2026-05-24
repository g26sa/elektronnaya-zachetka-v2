import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const buf = readFileSync("C:/Users/Самира/Downloads/shablon_importa_studentov.xlsm");
const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];

// Печатаем все непустые ячейки
const ref = ws["!ref"];
console.log("Лист:", wb.SheetNames[0], "| Диапазон:", ref);
console.log("\nВсе ячейки:");

const range = XLSX.utils.decode_range(ref ?? "A1:J20");
for (let r = range.s.r; r <= Math.min(range.e.r, 15); r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell && cell.v !== undefined && cell.v !== "") {
      console.log(`  ${addr}: [тип=${cell.t}] ${JSON.stringify(cell.v)}`);
    }
  }
}
