/**
 * Номер курса из названия группы: вторая цифра в номере группы.
 * Примеры: 225 → 2, 246-41 → 4, ИС-241 → 4.
 */
export function courseFromGroupName(groupName: string): number | null {
  const digits = groupName.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const n = parseInt(digits.charAt(1), 10);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : null;
}

export function groupMatchesCourse(groupName: string, course: string | number): boolean {
  if (course === "" || course == null) return false;
  const parsed = courseFromGroupName(groupName);
  return parsed !== null && String(parsed) === String(course);
}

export function uniqueCoursesFromGroupNames(names: Iterable<string>): number[] {
  const set = new Set<number>();
  for (const name of names) {
    const c = courseFromGroupName(name);
    if (c != null) set.add(c);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Группы для выбранного курса; без курса — пустой список. */
export function filterGroupNamesByCourse(allNames: Iterable<string>, course: string): string[] {
  if (!course) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of allNames) {
    if (!groupMatchesCourse(name, course) || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b, "ru"));
}

export type SemesterRef = { id: string; course: number; number: number };

export function resolveSemesterId(
  semesters: SemesterRef[],
  course: number,
  semesterNumber: number
): string | null {
  const match = semesters.find((s) => s.course === course && s.number === semesterNumber);
  return match?.id ?? null;
}

export function filterItemsByGroupCourse<T extends { group: { name: string } }>(
  items: T[],
  course?: string
): T[] {
  if (!course) return items;
  return items.filter((i) => groupMatchesCourse(i.group.name, course));
}

export function semesterPartsFromId(
  semesters: SemesterRef[],
  semesterId: string | null | undefined
): { course: string; semesterNumber: string } {
  if (!semesterId) return { course: "", semesterNumber: "" };
  const s = semesters.find((x) => x.id === semesterId);
  if (!s) return { course: "", semesterNumber: "" };
  return { course: String(s.course), semesterNumber: String(s.number) };
}
