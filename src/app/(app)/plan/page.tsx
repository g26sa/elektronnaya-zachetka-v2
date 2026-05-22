import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableFiltersBar } from "@/components/TableFiltersBar";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { PlanItemForm } from "./PlanItemForm";
import { PlanRowActions } from "./PlanRowActions";
import { teachingKindLabel, type TeachingKind } from "@/types/enums";
import { Plus, ClipboardList } from "lucide-react";

export default async function PlanPage() {
  await requireRole("HEAD");

  const [items, teachers, semesters, disciplines, groups, students] = await Promise.all([
    prisma.teachingAssignment.findMany({
      include: {
        teacher: { select: { id: true, fullName: true } },
        semester: true,
        discipline: true,
        group: true,
        student: { include: { user: true, group: true } },
      },
      orderBy: [
        { teacher: { fullName: "asc" } },
        { semester: { academicYear: "desc" } },
        { semester: { number: "asc" } },
      ],
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] }, isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "desc" }, { course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
  ]);

  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.academicYear}, ${s.course} к., ${s.number} сем.` }));
  const oD = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const oG = groups.map((g) => ({ id: g.id, label: g.name }));
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Планы преподавателей</h1>
          <p className="text-muted-foreground text-sm">
            Что какой преподаватель ведёт: дисциплины и группы, кол-во часов, привязка студентов для ВКР.
          </p>
        </div>
        <PlanItemForm
          teachers={oT}
          semesters={oSem}
          disciplines={oD}
          groups={oG}
          students={oS}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Назначить</Button>}
        />
      </div>

      <TableFiltersBar
        targetSelector='table[data-search="plan"] tbody tr'
        filters={[
          { key: "teacher", label: "Преподаватель" },
          { key: "kind", label: "Тип работы" },
          { key: "semester", label: "Семестр" },
          { key: "discipline", label: "Дисциплина" },
          { key: "group", label: "Группа" },
        ]}
      />
      <LiveTableFilter
        targetSelector='table[data-search="plan"] tbody tr'
        placeholder="Поиск по тексту…"
      />
      <TableSortEnhancer targetSelector='table[data-search="plan"]' />

      <Card>
        <CardContent className="p-0">
          <Table className="data-table" data-search="plan">
            <TableHeader><TableRow>
              <TableHead data-sort="text">Преподаватель</TableHead>
              <TableHead data-sort="text">Тип</TableHead>
              <TableHead data-sort="text">Семестр</TableHead>
              <TableHead data-sort="text">Дисциплина</TableHead>
              <TableHead data-sort="text">Группа</TableHead>
              <TableHead data-sort="text">Студент</TableHead>
              <TableHead data-sort="number">Часы</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow data-empty="1">
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    План пуст. Назначьте, кто и что ведёт — это разблокирует выставление оценок преподавателям.
                  </TableCell>
                </TableRow>
              ) : items.map((it) => {
                const sem = it.semester ? `${it.semester.academicYear}, ${it.semester.course} к., ${it.semester.number} сем.` : "—";
                return (
                  <TableRow
                    key={it.id}
                    data-teacher={it.teacher.fullName}
                    data-kind={teachingKindLabel(it.kind)}
                    data-semester={sem}
                    data-discipline={it.discipline?.name ?? ""}
                    data-group={it.group?.name ?? ""}
                  >
                    <TableCell>{it.teacher.fullName}</TableCell>
                    <TableCell><Badge variant="outline">{teachingKindLabel(it.kind)}</Badge></TableCell>
                    <TableCell>{sem}</TableCell>
                    <TableCell>{it.discipline?.name ?? "—"}</TableCell>
                    <TableCell>{it.group?.name ?? "—"}</TableCell>
                    <TableCell>{it.student?.user.fullName ?? "—"}</TableCell>
                    <TableCell>{it.hours ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <PlanRowActions
                        id={it.id}
                        initial={{
                          teacherId: it.teacherId,
                          kind: it.kind as TeachingKind,
                          semesterId: it.semesterId,
                          disciplineId: it.disciplineId,
                          groupId: it.groupId,
                          studentId: it.studentId,
                          hours: it.hours,
                          notes: it.notes,
                        }}
                        teachers={oT}
                        semesters={oSem}
                        disciplines={oD}
                        groups={oG}
                        students={oS}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
