import type { Role } from "@/types/enums";
import type { SessionPayload } from "@/lib/auth";

/**
 * Возможные действия системы.
 * Всё, что не упомянуто в матрице, — запрещено по умолчанию.
 */
export type Action =
  // Студенты
  | "student:viewSelf"
  | "student:viewAny"
  | "student:edit"
  // Промежуточная аттестация
  | "assessment:viewSelf"
  | "assessment:viewAny"
  | "assessment:create"
  | "assessment:edit"
  | "assessment:delete"
  // Курсовые
  | "courseWork:viewSelf"
  | "courseWork:viewAny"
  | "courseWork:create"
  | "courseWork:edit"
  | "courseWork:delete"
  // Практика
  | "practice:viewSelf"
  | "practice:viewAny"
  | "practice:create"
  | "practice:edit"
  | "practice:delete"
  // ВКР / защита / гос экзамен
  | "vkr:view"
  | "vkr:edit"
  | "defense:view"
  | "defense:edit"
  | "stateExam:view"
  | "stateExam:edit"
  // Шаблоны
  | "template:view"
  | "template:edit"
  // Учреждение
  | "institution:edit"
  // Управление пользователями / ролями
  | "user:view"
  | "user:edit"
  | "user:create"
  | "user:delete"
  // Аудит
  | "audit:viewSelf"
  | "audit:viewAny"
  // Экспорт
  | "export:self"
  | "export:any";

const MATRIX: Record<Role, Action[]> = {
  STUDENT: [
    "student:viewSelf",
    "assessment:viewSelf",
    "courseWork:viewSelf",
    "practice:viewSelf",
    "vkr:view",
    "defense:view",
    "stateExam:view",
    "audit:viewSelf",
    "export:self",
  ],
  TEACHER: [
    "student:viewAny",
    "assessment:viewAny",
    "assessment:create",
    "assessment:edit",
    "courseWork:viewAny",
    "courseWork:create",
    "courseWork:edit",
    "practice:viewAny",
    "practice:create",
    "practice:edit",
    "vkr:view",
    "defense:view",
    "stateExam:view",
    "export:any",
  ],
  HEAD: [
    "student:viewAny",
    "student:edit",
    "assessment:viewAny",
    "assessment:create",
    "assessment:edit",
    "assessment:delete",
    "courseWork:viewAny",
    "courseWork:create",
    "courseWork:edit",
    "courseWork:delete",
    "practice:viewAny",
    "practice:create",
    "practice:edit",
    "practice:delete",
    "vkr:view",
    "vkr:edit",
    "defense:view",
    "defense:edit",
    "stateExam:view",
    "stateExam:edit",
    "template:view",
    "template:edit",
    "institution:edit",
    "user:view",
    "user:edit",
    "user:create",
    "user:delete",
    "audit:viewAny",
    "export:any",
  ],
};

export function can(session: SessionPayload | null, action: Action): boolean {
  if (!session) return false;
  return MATRIX[session.role]?.includes(action) ?? false;
}

export function assertCan(session: SessionPayload | null, action: Action): asserts session is SessionPayload {
  if (!can(session, action)) {
    throw new Error("Доступ запрещён");
  }
}
