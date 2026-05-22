import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function gradeIsPassing(grade: string | null | undefined): boolean {
  if (!grade) return false;
  const g = grade.trim().toLowerCase();
  if (g === "зачтено" || g === "зачет" || g === "зачёт") return true;
  if (g === "не зачтено" || g === "незачет" || g === "незачёт") return false;
  const num = parseInt(g, 10);
  if (Number.isNaN(num)) return false;
  return num >= 3;
}

export function assessmentTypeLabel(type: string): string {
  switch (type) {
    case "EXAM": return "Экзамен";
    case "CREDIT": return "Зачёт";
    case "GRADED_CREDIT": return "Дифф. зачёт";
    default: return type;
  }
}

export function practiceKindLabel(kind: string): string {
  switch (kind) {
    case "EDUCATIONAL": return "Учебная";
    case "PRODUCTION": return "Производственная";
    case "PREDIPLOMA": return "Преддипломная";
    default: return kind;
  }
}

export function admissionLabel(a: string): string {
  return a === "ADMITTED" ? "Допущен" : "Не допущен";
}

export function roleLabel(role: string): string {
  switch (role) {
    case "STUDENT": return "Студент";
    case "TEACHER": return "Преподаватель";
    case "HEAD": return "Заведующий отделением";
    default: return role;
  }
}
