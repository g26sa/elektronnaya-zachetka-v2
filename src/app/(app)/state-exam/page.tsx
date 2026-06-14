import Link from "next/link";
import { requireSession } from "@/lib/auth";
import type { Admission } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StateExamForm } from "./StateExamForm";
import { StateExamRowActions } from "./StateExamRowActions";
import { TeacherStateExamView, type StateExamRow } from "./TeacherStateExamView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { admissionLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus, Printer } from "lucide-react";
import {
  courseFromGroupName,
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

export default async function StateExamPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string; speciality?: string; course?: string; group?: string;
    admission?: string; dateFrom?: string; dateTo?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";

  let studentId: string | null = params.studentId ?? null;
  if (isStudent) {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  if (session.role === "TEACHER") {
    const { pickTeacherListFilters } = await import("@/lib/teacher-list-filters");
    return (
      <TeacherFlow
        teacherId={session.userId}
        initialFilters={pickTeacherListFilters(params)}
      />
    );
  }

  const [allStudents, gekChairs] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    (prisma.gekChair as any).findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
  ]);

  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];

  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const hasFilters = !!(isStudent || studentId || params.speciality || params.course || params.group || params.admission || params.dateFrom || params.dateTo);

  const items = await prisma.stateExam.findMany({
    where: {
      ...(studentId
        ? { studentId }
        : !isStudent && filteredStudentIds.length !== allStudents.length
          ? { studentId: { in: filteredStudentIds } }
          : {}),
      ...(params.admission ? { admission: params.admission } : {}),
      ...(params.dateFrom || params.dateTo ? {
        date: {
          ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
          ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
        }
      } : {}),
    },
    include: { student: { include: { user: true, group: true } }, chair: true, chairGek: true },
    orderBy: { date: "desc" },
    ...(hasFilters ? {} : { take: 10 }),
  });

  const oS = allStudents.map((s) => ({
    id: s.id,
    label: s.user.fullName,
    groupName: s.group.name,
    speciality: s.group.speciality ?? "",
  }));
  const oCh = (gekChairs as Array<{ id: string; fullName: string }>).map((c) => ({ id: c.id, label: c.fullName }));

  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);
  if (studentId) reportParams.set("studentId", studentId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Государственный экзамен</h1>
        <div className="flex gap-2">
          {!isStudent && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/print/state-exam-report?${reportParams.toString()}`} target="_blank">
                <Printer className="h-4 w-4 mr-2" />Отчёт
              </Link>
            </Button>
          )}
          {can(session, "stateExam:edit") && (
            <StateExamForm
              students={oS} chairs={oCh}
              initial={{ studentId: studentId ?? undefined }}
              trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
            />
          )}
        </div>
      </div>

      {!isStudent && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <AutoFilterForm action="/state-exam" className="grid sm:grid-cols-3 gap-3">
              <Sel name="speciality" label="Специальность" value={params.speciality ?? ""} opts={specialities.map((s) => ({ v: s, l: s }))} />
              <Sel name="course" label="Курс" value={params.course ?? ""} opts={courses.map((c) => ({ v: String(c), l: String(c) }))} />
              <Sel
                name="group"
                label="Группа"
                value={params.group ?? ""}
                opts={groups.map((g) => ({ v: g, l: g }))}
                disabled={!params.course}
                emptyLabel={params.course ? "— все —" : "Сначала курс"}
              />
              <Sel name="studentId" label="Студент" value={studentId ?? ""} opts={filteredStudents.map((s) => ({ v: s.id, l: `${s.user.fullName} (${s.group.name})` }))} />
              <Sel name="admission" label="Допуск" value={params.admission ?? ""} opts={[{ v: "ADMITTED", l: "Допущен" }, { v: "NOT_ADMITTED", l: "Не допущен" }]} />
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата экзамена с</label>
                <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата экзамена по</label>
                <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="flex gap-2 items-end sm:col-span-3">
                {hasFilters && <Button type="button" variant="ghost" size="sm" asChild><Link href="/state-exam">Сбросить</Link></Button>}
              </div>
            </AutoFilterForm>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            {!isStudent && <TableHead>Студент</TableHead>}
            {!isStudent && <TableHead>Группа</TableHead>}
            <TableHead>Название</TableHead>
            <TableHead>Допуск</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Оценка</TableHead>
            <TableHead>Председатель ГЭК</TableHead>
            <TableHead>Протокол</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 6 : 9} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((e) => (
              <TableRow key={e.id}>
                {!isStudent && <TableCell>{e.student.user.fullName}</TableCell>}
                {!isStudent && <TableCell>{e.student.group.name}</TableCell>}
                <TableCell>{e.name}</TableCell>
                <TableCell>
                  <Badge variant={e.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(e.admission)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                <TableCell>
                  {e.grade ? <Badge variant={gradeIsPassing(e.grade) ? "success" : "destructive"}>{e.grade}</Badge> : "—"}
                </TableCell>
                <TableCell>{(e as any).chairGek?.fullName ?? e.chair?.fullName ?? "—"}</TableCell>
                <TableCell>{e.protocolNumber ?? "—"}</TableCell>
                {!isStudent && (
                  <TableCell className="text-right">
                    <StateExamRowActions
                      id={e.id}
                      initial={{
                        studentId: e.studentId, name: e.name, admission: e.admission as Admission,
                        admissionDate: e.admissionDate ? e.admissionDate.toISOString().slice(0, 10) : "",
                        date: e.date ? e.date.toISOString().slice(0, 10) : "",
                        grade: e.grade ?? "", chairGekId: (e as any).chairGekId ?? "",
                        protocolNumber: e.protocolNumber ?? "",
                      } as any}
                      students={oS} chairs={oCh}
                      canEdit={can(session, "stateExam:edit")}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

async function TeacherFlow({
  teacherId,
  initialFilters,
}: {
  teacherId: string;
  initialFilters?: import("@/lib/teacher-plan-display").TeacherListFilters;
}) {
  const plan = await getTeacherPlan(teacherId);
  const planStudentIds = Array.from(
    new Set(plan.filter((p) => p.studentId).map((p) => p.studentId!))
  );
  const groupIds = Array.from(new Set(plan.filter((p) => p.groupId).map((p) => p.groupId!)));
  const studentsFromGroups = groupIds.length > 0
    ? await prisma.student.findMany({ where: { groupId: { in: groupIds } }, select: { id: true } })
    : [];
  const visibleStudentIds = Array.from(new Set([
    ...planStudentIds,
    ...studentsFromGroups.map((s) => s.id),
  ]));

  const items = visibleStudentIds.length === 0 ? [] : await prisma.stateExam.findMany({
    where: { studentId: { in: visibleStudentIds } },
    include: {
      student: { include: { user: true, group: true } },
      chair: true,
      chairGek: true,
    },
    orderBy: { date: "desc" },
  });

  const rows: StateExamRow[] = items.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    studentName: e.student.user.fullName,
    groupName: e.student.group.name,
    groupSpeciality: e.student.group.speciality ?? "",
    course: courseFromGroupName(e.student.group.name) ?? e.student.currentCourse,
    name: e.name,
    admission: e.admission,
    admissionDate: e.admissionDate,
    date: e.date,
    grade: e.grade,
    chairName: e.chairGek?.fullName ?? e.chair?.fullName ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Государственный экзамен</h1>
      <TeacherStateExamView rows={rows} initialFilters={initialFilters} />
    </div>
  );
}

function Sel({
  name, label, value, opts, disabled, emptyLabel = "— все —",
}: {
  name: string;
  label: string;
  value: string;
  opts: { v: string; l: string }[];
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
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
