/**
 * Реплейс enum'ов Prisma, потому что MS SQL Server в Prisma 6 их не поддерживает.
 * Поля хранятся как String, а здесь — TypeScript-типизация и валидация.
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
