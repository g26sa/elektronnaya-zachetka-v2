import { gradeIsPassing } from "@/lib/utils";

export type ProgressStatus =
  | { kind: "promoted"; nextCourse: number; lastSemesterId: string }
  | { kind: "debt"; failed: { discipline: string; grade: string }[]; missing: string[] }
  | { kind: "in_progress"; remaining: string[] }
  | { kind: "no_data" };

/**
 * Простейшая логика статуса промежуточной аттестации.
 * Принимает оценки одного семестра и плановые дисциплины.
 * "переведён" — все плановые дисциплины имеют положительную оценку.
 * "задолженность" — есть оценка, не являющаяся положительной.
 * "в процессе" — нет оценки, но и нет фейлов.
 */
export function evaluateSemester(input: {
  plannedDisciplines: string[];
  assessments: { discipline: string; grade: string }[];
  course: number;
  semesterNumber: number;
  semesterId: string;
}): ProgressStatus {
  if (input.plannedDisciplines.length === 0 && input.assessments.length === 0) {
    return { kind: "no_data" };
  }

  const byDiscipline = new Map<string, string>();
  for (const a of input.assessments) byDiscipline.set(a.discipline, a.grade);

  const failed: { discipline: string; grade: string }[] = [];
  const missing: string[] = [];

  for (const d of input.plannedDisciplines) {
    const grade = byDiscipline.get(d);
    if (!grade) {
      missing.push(d);
    } else if (!gradeIsPassing(grade)) {
      failed.push({ discipline: d, grade });
    }
  }

  if (failed.length > 0) return { kind: "debt", failed, missing };
  if (missing.length > 0) return { kind: "in_progress", remaining: missing };

  // Всё закрыто — переводим на следующий курс, если это был 2-й семестр
  const nextCourse = input.semesterNumber === 2 ? input.course + 1 : input.course;
  return { kind: "promoted", nextCourse, lastSemesterId: input.semesterId };
}
