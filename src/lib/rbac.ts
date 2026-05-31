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
  // Группы
  | "group:view"
  | "group:create"
  | "group:edit"
  | "group:delete"
  // План преподавателя (что он ведёт)
  | "plan:viewOwn"
  | "plan:viewAny"
  | "plan:edit"
  // Справочники
  | "reference:edit"
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
    "assessment:delete",      // только свои — проверка на уровне action'а
    "courseWork:viewAny",
    "courseWork:create",
    "courseWork:edit",
    "courseWork:delete",      // только свои
    "practice:viewAny",
    "practice:create",
    "practice:edit",
    "practice:delete",        // только свои
    "vkr:view",
    "vkr:edit",               // только привязанным студентам (проверка в action)
    "defense:view",
    "defense:edit",           // только привязанным
    "stateExam:view",
    "plan:viewOwn",
    "export:any",
  ],
  HEAD: [
    "student:viewAny",
    "student:edit",
    "assessment:viewAny",
    "assessment:edit",
    "assessment:delete",
    "courseWork:viewAny",
    "courseWork:edit",
    "courseWork:delete",
    "practice:viewAny",
    "practice:edit",
    "practice:delete",
    "vkr:view",
    "vkr:edit",
    "defense:view",
    "defense:edit",
    "stateExam:view",
    "stateExam:edit",
    "group:view",
    "group:create",
    "group:edit",
    "group:delete",
    "plan:viewAny",
    "plan:edit",
    "reference:edit",
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
