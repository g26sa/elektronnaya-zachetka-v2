/** Стабильное значение для контролируемых input/select (не undefined). */
export function cv(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}
