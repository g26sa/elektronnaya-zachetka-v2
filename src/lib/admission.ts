import { gradeIsPassing } from "@/lib/utils";

export type AdmissionStatus =
  | { kind: "admitted"; total: number }
  | { kind: "not_admitted"; failed: { discipline: string; grade: string; type: "assessment" | "coursework" }[] }
  | { kind: "no_data" };

/**
 * Студент считается «допущенным» только если ВСЕ имеющиеся записи
 * (промежуточные аттестации + курсовые работы) имеют положительную оценку
 * (3, 4, 5 или «зачтено»). Если хоть одна оценка непроходная — «не допущен».
 * Если записей нет — «нет данных».
 */
export function evaluateAdmission(input: {
  assessments: { discipline: { name: string }; grade: string }[];
  courseWorks: { discipline: { name: string }; grade: string }[];
}): AdmissionStatus {
  const total = input.assessments.length + input.courseWorks.length;
  if (total === 0) return { kind: "no_data" };

  const failed: { discipline: string; grade: string; type: "assessment" | "coursework" }[] = [];

  for (const a of input.assessments) {
    if (!gradeIsPassing(a.grade)) {
      failed.push({ discipline: a.discipline.name, grade: a.grade, type: "assessment" });
    }
  }
  for (const c of input.courseWorks) {
    if (!gradeIsPassing(c.grade)) {
      failed.push({ discipline: c.discipline.name, grade: c.grade, type: "coursework" });
    }
  }

  return failed.length === 0 ? { kind: "admitted", total } : { kind: "not_admitted", failed };
}
