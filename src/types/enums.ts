/**
 * TypeScript-литералы для полей с фиксированным набором значений
 * (хранятся в БД как String). Использовать в Zod-схемах и компонентах.
 *
 * При добавлении нового значения обновляйте Zod-схемы в src/schemas/*.
 */

export const RoleValues = ["STUDENT", "TEACHER", "HEAD"] as const;
export type Role = (typeof RoleValues)[number];

export const AssessmentTypeValues = ["EXAM", "CREDIT", "GRADED_CREDIT"] as const;
export type AssessmentType = (typeof AssessmentTypeValues)[number];

export const PracticeKindValues = ["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"] as const;
export type PracticeKind = (typeof PracticeKindValues)[number];

export const AdmissionValues = ["ADMITTED", "NOT_ADMITTED"] as const;
export type Admission = (typeof AdmissionValues)[number];

export const AuditActionValues = ["CREATE", "UPDATE", "DELETE", "EXPORT", "LOGIN", "ROLE_CHANGE"] as const;
export type AuditAction = (typeof AuditActionValues)[number];

/**
 * Тип записи в плане преподавателя:
 *   ASSESSMENT        — ведёт дисциплину в группе (промежуточная аттестация)
 *   COURSEWORK        — руководит курсовыми по дисциплине в группе
 *   PRACTICE          — руководит практикой группы
 *   VKR               — научный руководитель ВКР конкретного студента
 *   DEFENSE_CHAIR     — председатель ГЭК на защите ВКР конкретного студента
 *   STATE_EXAM_CHAIR  — председатель ГЭК на гос. экзамене конкретного студента
 */
export const TeachingKindValues = ["ASSESSMENT", "COURSEWORK", "PRACTICE", "VKR", "DEFENSE_CHAIR", "STATE_EXAM_CHAIR"] as const;
export type TeachingKind = (typeof TeachingKindValues)[number];

export function teachingKindLabel(k: string): string {
  switch (k) {
    case "ASSESSMENT": return "Промежуточная аттестация";
    case "COURSEWORK": return "Курсовая работа";
    case "PRACTICE": return "Практика";
    case "VKR": return "Руководство ВКР";
    case "DEFENSE_CHAIR": return "Председатель ГЭК (защита ВКР)";
    case "STATE_EXAM_CHAIR": return "Председатель ГЭК (гос. экзамен)";
    default: return k;
  }
}
