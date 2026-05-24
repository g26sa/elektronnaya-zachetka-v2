import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const buf = readFileSync("C:/Users/Самира/Downloads/shablon_importa_studentov.xlsm");
const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];

console.log("Диапазон листа:", ws["!ref"]);
console.log("B1 (группа):", JSON.stringify(ws["B1"]?.v));
console.log("B2 (дата):", JSON.stringify(ws["B2"]?.v));
console.log();

let count = 0;
for (let row = 3; row <= 50; row++) {
  const e = ws[`E${row}`]?.v;
  const f = ws[`F${row}`]?.v;
  const g = ws[`G${row}`]?.v;
  const h = ws[`H${row}`]?.v;
  if (e === undefined && f === undefined && g === undefined && h === undefined) {
    console.log(`Строка ${row}: ПУСТАЯ (здесь loop сломается)`);
    break;
  }
  count++;
  console.log(`Строка ${row}: E=${JSON.stringify(e)} | F=${JSON.stringify(f)} | G=${JSON.stringify(g)} | H=${JSON.stringify(h)}`);
}
console.log(`\nВсего строк с данными: ${count}`);
