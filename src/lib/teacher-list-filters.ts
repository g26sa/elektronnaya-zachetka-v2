import type { TeacherListFilters } from "@/lib/teacher-plan-display";

export function pickTeacherListFilters(
  params: Record<string, string | undefined>
): TeacherListFilters {
  const out: TeacherListFilters = {};
  if (params.studentId) out.studentId = params.studentId;
  if (params.group) out.group = params.group;
  if (params.semester) out.semester = params.semester;
  if (params.discipline) out.discipline = params.discipline;
  if (params.kind) out.kind = params.kind;
  return out;
}
