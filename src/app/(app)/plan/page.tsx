import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanItemForm } from "./PlanItemForm";
import { PlanRowActions } from "./PlanRowActions";
import type { PlanTeachingKind, TeachingKind } from "@/types/enums";
import {
  courseFromGroupName,
  filterGroupNamesByCourse,
  groupMatchesCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

const TABS = [
  { key: "ASSESSMENT", label: "Дисциплины" },
  { key: "COURSEWORK",  label: "Курсовые работы" },
  { key: "PRACTICE",   label: "Практики" },
  { key: "VKR",        label: "Руководство ВКР" },
] as const;

type PlanSearchParams = {
  tab?: string;
  teacher?: string;
  course?: string;
  group?: string;
  discipline?: string;
  student?: string;
};

function planHref(tab: string, params: PlanSearchParams) {
  const sp = new URLSearchParams();
  sp.set("tab", tab);
  if (params.teacher) sp.set("teacher", params.teacher);
  if (params.course) sp.set("course", params.course);
  if (params.group) sp.set("group", params.group);
  if ((tab === "ASSESSMENT" || tab === "COURSEWORK") && params.discipline) {
    sp.set("discipline", params.discipline);
  }
  if (tab === "VKR" && params.student) sp.set("student", params.student);
  return `/plan?${sp.toString()}`;
}

function planReportHref(tab: string, params: PlanSearchParams) {
  const sp = new URLSearchParams();
  sp.set("kind", tab);
  if (params.teacher) sp.set("teacher", params.teacher);
  if (params.course) sp.set("course", params.course);
  if (params.group) sp.set("group", params.group);
  if ((tab === "ASSESSMENT" || tab === "COURSEWORK") && params.discipline) {
    sp.set("discipline", params.discipline);
  }
  if (tab === "VKR" && params.student) sp.set("student", params.student);
  return `/print/teacher-plan?${sp.toString()}`;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<PlanSearchParams>;
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
    prisma.user.findMany({ where: { role: "TEACHER", isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.semester.findMany({ orderBy: [{ course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
  ]);

  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));
  const oSem = semesters.map((s) => ({ id: s.id, course: s.course, number: s.number }));
  const oD = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const oG = groups.map((g) => ({ id: g.id, name: g.name, speciality: g.speciality ?? "" }));
  const oS = students.map((s) => ({
    id: s.id,
    label: `${s.user.fullName} (${s.group.name})`,
    groupId: s.groupId,
  }));

  let filtered = items;
  if (params.teacher) filtered = filtered.filter((i) => i.teacherId === params.teacher);
  if (params.course) {
    filtered = filtered.filter((i) => {
      const gName = i.group?.name ?? i.student?.group.name;
      return gName ? groupMatchesCourse(gName, params.course!) : false;
    });
  }
  if (params.group) {
    filtered = filtered.filter((i) => (i.group?.name ?? i.student?.group.name) === params.group);
  }
  if (params.discipline && (activeTab === "ASSESSMENT" || activeTab === "COURSEWORK")) {
    filtered = filtered.filter((i) => i.discipline?.name === params.discipline);
  }
  if (params.student && activeTab === "VKR") {
    filtered = filtered.filter((i) => i.studentId === params.student);
  }

  const teacherOptions = Array.from(
    new Map(items.map((i) => [i.teacher.id, i.teacher.fullName] as const)).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const uniqueDisciplines = Array.from(
    new Set(
      items
        .filter((i) => i.discipline?.name)
        .map((i) => i.discipline!.name)
    )
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const allGroupNames = items
    .map((i) => i.group?.name ?? i.student?.group.name)
    .filter(Boolean) as string[];
  const courses = uniqueCoursesFromGroupNames(allGroupNames);
  const filterGroupOptions = params.course
    ? filterGroupNamesByCourse(allGroupNames, params.course).map((name) => ({ value: name, label: name }))
    : [];

  const studentOptions = Array.from(
    new Map(
      items
        .filter((i) => i.student)
        .map((i) => [i.student!.id, `${i.student!.user.fullName} (${i.student!.group.name})`] as const)
    ).entries()
  )
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ru"));

  const isVkr = activeTab === "VKR";
  const hasDisciplineFilter = activeTab === "ASSESSMENT" || activeTab === "COURSEWORK";
  const hasDiscipLine = hasDisciplineFilter;
  const hasFilters = !!(
    params.teacher ||
    params.course ||
    params.group ||
    (hasDisciplineFilter && params.discipline) ||
    (isVkr && params.student)
  );

  const colCount =
    2 +
    (isVkr ? 3 : 2) +
    (hasDiscipLine ? 1 : 0) +
    (activeTab === "ASSESSMENT" ? 1 : 0) +
    1;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Планы преподавателей</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={planReportHref(activeTab, params)} target="_blank">
              <Printer className="h-4 w-4 mr-2" />Отчёт
            </Link>
          </Button>
          <PlanItemForm
            teachers={oT}
            semesters={oSem}
            disciplines={oD}
            groups={oG}
            students={oS}
            defaultKind={activeTab as PlanTeachingKind}
            isHead={true}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Назначить</Button>}
          />
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-0 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={planHref(tab.key, params)}
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
      <Card>
        <CardContent className="p-4">
          <AutoFilterForm action="/plan" className="flex flex-wrap gap-3 items-end" hidden={{ tab: activeTab }}>
            {teacherOptions.length > 0 && (
              <FilterSelect
                name="teacher"
                label="Преподаватель"
                value={params.teacher ?? ""}
                options={teacherOptions.map((t) => ({ value: t.id, label: t.name }))}
                minWidth
              />
            )}
            {courses.length > 0 && (
              <FilterSelect
                name="course"
                label="Курс"
                value={params.course ?? ""}
                options={courses.map((c) => ({ value: String(c), label: String(c) }))}
              />
            )}
            <FilterSelect
              name="group"
              label="Группа"
              value={params.group ?? ""}
              options={filterGroupOptions}
              disabled={!params.course}
              emptyLabel={params.course ? "— все —" : "Сначала выберите курс"}
            />
            {hasDisciplineFilter && uniqueDisciplines.length > 0 && (
              <FilterSelect
                name="discipline"
                label="Дисциплина"
                value={params.discipline ?? ""}
                options={uniqueDisciplines.map((d) => ({ value: d, label: d }))}
                minWidth
              />
            )}
            {isVkr && studentOptions.length > 0 && (
              <FilterSelect
                name="student"
                label="Студент"
                value={params.student ?? ""}
                options={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
                minWidth
              />
            )}
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href={`/plan?tab=${activeTab}`}>Сбросить</Link>
              </Button>
            )}
          </AutoFilterForm>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Преподаватель</TableHead>
                {isVkr ? (
                  <>
                    <TableHead>Курс</TableHead>
                    <TableHead>Группа</TableHead>
                    <TableHead>Студент</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Курс / Сем.</TableHead>
                    <TableHead>Группа</TableHead>
                  </>
                )}
                {hasDiscipLine && <TableHead>Дисциплина</TableHead>}
                {activeTab === "ASSESSMENT" && <TableHead>Часы</TableHead>}
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center text-muted-foreground py-10">
                    Нет записей. Нажмите «Назначить» чтобы добавить.
                  </TableCell>
                </TableRow>
              ) : filtered.map((it) => {
                const groupName = it.group?.name ?? it.student?.group.name;
                const courseFromGroup = groupName ? courseFromGroupName(groupName) : null;
                const semLabel = it.semester
                  ? `${courseFromGroup ?? it.semester.course}к, ${it.semester.number} сем.`
                  : courseFromGroup
                    ? `${courseFromGroup}к`
                    : null;
                return (
                  <TableRow key={it.id}>
                    <TableCell>{it.teacher.fullName}</TableCell>
                    {isVkr ? (
                      <>
                        <TableCell>{courseFromGroup ? `${courseFromGroup}` : "—"}</TableCell>
                        <TableCell>{groupName ?? "—"}</TableCell>
                        <TableCell>{it.student?.user.fullName ?? "—"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{semLabel}</TableCell>
                        <TableCell>{it.group?.name}</TableCell>
                      </>
                    )}
                    {hasDiscipLine && <TableCell>{it.discipline?.name}</TableCell>}
                    {activeTab === "ASSESSMENT" && <TableCell>{it.hours}</TableCell>}
                    <TableCell className="text-right">
                      <PlanRowActions
                        id={it.id}
                        initial={{
                          teacherId: it.teacherId,
                          kind: it.kind as TeachingKind,
                          controlForm: (it as any).controlForm ?? undefined,
                          semesterId: it.semesterId,
                          disciplineId: it.disciplineId,
                          groupId: it.groupId ?? it.student?.groupId ?? undefined,
                          studentId: it.studentId,
                          hours: it.hours,
                        } as any}
                        teachers={oT}
                        semesters={oSem}
                        disciplines={oD}
                        groups={oG}
                        students={oS}
                        isHead={true}
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

function FilterSelect({
  name,
  label,
  value,
  options,
  minWidth,
  disabled,
  emptyLabel = "— все —",
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  minWidth?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-muted-foreground block">{label}</label>
      <select
        name={name}
        defaultValue={value}
        disabled={disabled}
        className={
          "flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50" +
          (minWidth ? " min-w-[180px]" : "")
        }
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
