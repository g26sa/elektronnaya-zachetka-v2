import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "success" | "destructive" | "outline" | "secondary" }> = {
  CREATE: { label: "Создано",  variant: "success" },
  UPDATE: { label: "Изменено", variant: "default" },
  DELETE: { label: "Удалено",  variant: "destructive" },
};

const ENTITY_LABELS: Record<string, string> = {
  Assessment:          "Оценка",
  TeachingAssignment:  "Назначение преподавателя",
  Student:             "Студент",
  Group:               "Группа",
  CourseWork:          "Курсовая работа",
  Practice:            "Практика",
  VKR:                 "ВКР",
  Defense:             "Защита ВКР",
  StateExam:           "Государственный экзамен",
  DocumentTemplate:    "Шаблон документа",
  Discipline:          "Дисциплина",
  Semester:            "Семестр",
  Notification:        "Уведомление",
  Institution:         "Настройки учреждения",
  User:                "Пользователь",
  GekChair:            "Председатель ГЭК",
};

const FIELD_LABELS: Record<string, string> = {
  grade:          "Оценка",
  date:           "Дата",
  type:           "Форма контроля",
  hours:          "Часы",
  creditUnits:    "З.е.",
  studentId:      "Студент",
  teacherId:      "Преподаватель",
  disciplineId:   "Дисциплина",
  semesterId:     "Семестр",
  groupId:        "Группа",
  topic:          "Тема",
  name:           "Название",
  admission:      "Допуск",
  admissionDate:  "Дата допуска",
  protocolNumber: "Номер протокола",
  chairId:        "Председатель",
  chairGekId:     "Председатель ГЭК",
  fullName:       "ФИО",
  email:          "Email",
  role:           "Роль",
  isActive:       "Активен",
  place:          "Место прохождения",
  kind:           "Вид",
  startDate:      "Дата начала",
  endDate:        "Дата окончания",
  gradeDate:      "Дата оценки",
  controlForm:    "Форма контроля",
};

function humanizeDiff(diff: string | null): string {
  if (!diff) return "—";
  try {
    const parsed = JSON.parse(diff);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return diff;

    const before = parsed.before ?? {};
    const after  = parsed.after  ?? {};

    // For CREATE — list key values from after
    if (!parsed.before && parsed.after) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(after)) {
        if (k === "id" || k === "createdAt" || k === "updatedAt") continue;
        const label = FIELD_LABELS[k] ?? k;
        parts.push(`${label}: ${String(v ?? "—")}`);
      }
      return parts.slice(0, 5).join("; ") || diff;
    }

    // For DELETE
    if (parsed.before && !parsed.after) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(before)) {
        if (k === "id" || k === "createdAt" || k === "updatedAt") continue;
        const label = FIELD_LABELS[k] ?? k;
        parts.push(`${label}: ${String(v ?? "—")}`);
      }
      return parts.slice(0, 5).join("; ") || diff;
    }

    // For UPDATE — show only changed fields
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of allKeys) {
      if (k === "id" || k === "createdAt" || k === "updatedAt") continue;
      const bv = before[k];
      const av = after[k];
      if (String(bv) !== String(av)) {
        const label = FIELD_LABELS[k] ?? k;
        changes.push(`${label}: «${bv ?? "—"}» → «${av ?? "—"}»`);
      }
    }
    return changes.length ? changes.join("; ") : "Без изменений";
  } catch {
    return diff;
  }
}

export default async function AuditPage() {
  const session = await requireSession();
  const filter: Prisma.AuditLogWhereInput | undefined =
    session.role === "HEAD" ? undefined : { userId: session.userId };

  const logs = await prisma.auditLog.findMany({
    where: filter,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">История изменений</h1>
      </div>
      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>Дата и время</TableHead>
            <TableHead>Пользователь</TableHead>
            <TableHead>Действие</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Описание изменений</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Нет событий.</TableCell></TableRow>
            ) : logs.map((l) => {
              const action = ACTION_LABELS[l.action] ?? { label: l.action, variant: "outline" as const };
              const entity = ENTITY_LABELS[l.entity] ?? l.entity;
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{l.createdAt.toLocaleString("ru-RU")}</TableCell>
                  <TableCell>{l.user?.fullName ?? "—"}</TableCell>
                  <TableCell><Badge variant={action.variant}>{action.label}</Badge></TableCell>
                  <TableCell>{entity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md">
                    {humanizeDiff(l.diff)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
