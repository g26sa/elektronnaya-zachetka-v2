/** Форматирует порядковый номер зачётной книжки: 1 → «00001». */
export function formatRecordBookNumber(n: number): string {
  return String(n).padStart(5, "0");
}

/** Извлекает числовую часть из номера зачётной книжки. */
export function parseRecordBookNumber(value: string): number {
  const n = parseInt(value.replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/** Максимальный числовой номер среди всех студентов. */
export function maxRecordBookNumber(numbers: string[]): number {
  let max = 0;
  for (const num of numbers) {
    const n = parseRecordBookNumber(num);
    if (n > max) max = n;
  }
  return max;
}
