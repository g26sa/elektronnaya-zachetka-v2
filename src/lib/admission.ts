import { gradeIsPassing } from "@/lib/utils";

export type AdmissionStatus =
  | { kind: "admitted"; total: number }
  | {
      kind: "not_admitted";
      failed: {
        recordId: string;
        discipline: string;
        grade: string;
        type: "assessment" | "coursework";
        pageIndex: number | null; // индекс семестра в зачётной книжке (для перехода)
      }[];
    }
  | { kind: "no_data" };

/**
 * Студент считается «допущенным» только если ВСЕ имеющиеся записи
 * (промежуточные аттестации + курсовые работы) имеют положительную оценку
 * (3, 4, 5 или «зачтено»). Если хоть одна оценка непроходная — «не допущен».
 * Если записей нет — «нет данных».
 *
 * recordId + pageIndex возвращаются, чтобы в UI можно было кликнуть по
 * провалу и сразу попасть на нужную страницу зачётной книжки.
 */
export function evaluateAdmission(input: {
  assessments: { id: string; discipline: { name: string }; grade: string; semesterId: string }[];
  courseWorks: { id: string; discipline: { name: string }; grade: string | null }[];
  // Семестры в том же порядке, в котором рендерятся в RecordBookPage
  orderedSemesterIds?: string[];
}): AdmissionStatus {
  // Курсовые без оценки (только тема) — не считаются «непроходными», просто пропускаем
  const gradedCourseWorks = input.courseWorks.filter((c) => c.grade != null);
  const total = input.assessments.length + gradedCourseWorks.length;
  if (total === 0) return { kind: "no_data" };

  const semIdx = new Map<string, number>();
  if (input.orderedSemesterIds) {
    input.orderedSemesterIds.forEach((id, i) => semIdx.set(id, i));
  }

  type Failed = {
    recordId: string;
    discipline: string;
    grade: string;
    type: "assessment" | "coursework";
    pageIndex: number | null;
  };
  const failed: Failed[] = [];

  for (const a of input.assessments) {
    if (!gradeIsPassing(a.grade)) {
      failed.push({
        recordId: a.id,
        discipline: a.discipline.name,
        grade: a.grade,
        type: "assessment",
        pageIndex: semIdx.get(a.semesterId) ?? null,
      });
    }
  }
  for (const c of gradedCourseWorks) {
    if (!gradeIsPassing(c.grade)) {
      failed.push({
        recordId: c.id,
        discipline: c.discipline.name,
        grade: c.grade ?? "",
        type: "coursework",
        pageIndex: null,
      });
    }
  }

  return failed.length === 0 ? { kind: "admitted", total } : { kind: "not_admitted", failed };
}
