import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanItemForm } from "./PlanItemForm";
import { PlanRowActions } from "./PlanRowActions";
import type { TeachingKind } from "@/types/enums";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";

const TABS = [
  { key: "ASSESSMENT", label: "Промежуточная аттестация" },
  { key: "COURSEWORK",  label: "Курсовые работы" },
  { key: "PRACTICE",   label: "Практики" },
  { key: "VKR",        label: "Руководство ВКР" },
] as const;

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; teacher?: string; course?: string; group?: string; discipline?: string }>;
}) {
  await requireRole("HEAD");
  const params = await searchParams;
  const activeTab = (TABS.find((t) => t.key === params.tab)?.key ?? "ASSESSMENT") as TeachingKind;

  const [items, teachers, semesters, disciplines, groups, students] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { kind: activeTab },
      include: {
        teacher: { select: { id: true, fullName: true } },
        semester: true,
        discipline: true,
        group: true,
        student: { include: { user: true, group: true } },
      },
      orderBy: [
        { teacher: { fullName: "asc" } },
        { semester: { course: "asc" } },
        { semester: { number: "asc" } },
      ],
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] }, isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.semester.findMany({ orderBy: [{ course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
  ]);

  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.course} курс, ${s.number} семестр (${s.academicYear})` }));
  const oD = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const oG = groups.map((g) => ({ id: g.id, label: g.name }));
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));

  // Применяем фильтры
  let filtered = items;
  if (params.teacher) filtered = filtered.filter((i) => i.teacher.fullName.toLowerCase().includes(params.teacher!.toLowerCase()));
  if (params.course) filtered = filtered.filter((i) => i.semester && String(i.semester.course) === params.course);
  if (params.group) filtered = filtered.filter((i) => i.group?.name === params.group);
  if (params.discipline) filtered = filtered.filter((i) => i.discipline?.name === params.discipline);

  const uniqueGroups = Array.from(new Set(items.map((i) => i.group?.name).filter(Boolean) as string[])).sort();
  const uniqueDisciplines = Array.from(new Set(items.map((i) => i.discipline?.name).filter(Boolean) as string[])).sort();
  const courses = Array.from(new Set(items.map((i) => i.semester?.course).filter(Boolean) as number[])).sort();

  const isVkr = activeTab === "VKR";
  const hasDiscipLine = activeTab === "ASSESSMENT" || activeTab === "COURSEWORK";
  const hasPractice = activeTab === "PRACTICE";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Планы преподавателей</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/print/teacher-plan?kind=${activeTab}`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />Отчёт
            </Link>
          </Button>
          <PlanItemForm
            teachers={oT}
            semesters={oSem}
            disciplines={oD}
            groups={oG}
            students={oS}
            defaultKind={activeTab}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Назначить</Button>}
          />
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-0 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/plan?tab=${tab.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Фильтры */}
      <form action="/plan" method="get" className="flex flex-wrap gap-4 items-end">
        <input type="hidden" name="tab" value={activeTab} />
        {courses.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground block">Курс</label>
            <select name="course" defaultValue={params.course ?? ""} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— все —</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {uniqueGroups.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground block">Группа</label>
            <select name="group" defaultValue={params.group ?? ""} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— все —</option>
              {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
        {uniqueDisciplines.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дисциплина</label>
            <select name="discipline" defaultValue={params.discipline ?? ""} className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm min-w-[180px]">
              <option value="">— все —</option>
              {uniqueDisciplines.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        <Button type="submit" variant="outline" size="sm">Применить</Button>
        {(params.course || params.group || params.discipline) && (
          <Button type="button" variant="ghost" size="sm" onClick={undefined} asChild>
            <Link href={`/plan?tab=${activeTab}`}>Сбросить</Link>
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Преподаватель</TableHead>
                <TableHead>Курс / Сем.</TableHead>
                {!isVkr && <TableHead>Группа</TableHead>}
                {hasDiscipLine && <TableHead>Дисциплина</TableHead>}
                {isVkr && <TableHead>Студент</TableHead>}
                {activeTab === "ASSESSMENT" && <TableHead>Часы</TableHead>}
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Нет записей. Нажмите «Назначить» чтобы добавить.
                  </TableCell>
                </TableRow>
              ) : filtered.map((it) => {
                const semLabel = it.semester
                  ? `${it.semester.course}к, ${it.semester.number} сем.`
                  : null;
                return (
                  <TableRow key={it.id}>
                    <TableCell>{it.teacher.fullName}</TableCell>
                    <TableCell>{semLabel}</TableCell>
                    {!isVkr && <TableCell>{it.group?.name}</TableCell>}
                    {hasDiscipLine && <TableCell>{it.discipline?.name}</TableCell>}
                    {isVkr && <TableCell>{it.student?.user.fullName}</TableCell>}
                    {activeTab === "ASSESSMENT" && <TableCell>{it.hours}</TableCell>}
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
