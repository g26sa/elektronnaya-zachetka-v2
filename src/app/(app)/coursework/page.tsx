import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CourseWorkForm } from "@/components/forms/CourseWorkForm";
import { CourseWorkRowActions } from "./CourseWorkRowActions";
import { getTeacherStudentIds, getTeacherDisciplineIds, getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherCourseworkView, type CourseworkRow } from "./TeacherCourseworkView";
import { formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";
import {
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

export default async function CourseWorkPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string; speciality?: string; course?: string; group?: string;
    semester?: string; discipline?: string; dateFrom?: string; dateTo?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";
  const isTeacherRole = session.role === "TEACHER";

  if (isTeacherRole) {
    const { pickTeacherListFilters } = await import("@/lib/teacher-list-filters");
    return (
      <TeacherFlow
        teacherId={session.userId}
        initialFilters={pickTeacherListFilters(params)}
      />
    );
  }

  let studentId: string | null = params.studentId ?? null;
  if (isStudent) {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  const [allowedStudentIds, allowedDisciplineIds] = isTeacherRole
    ? await Promise.all([
        getTeacherStudentIds(session.userId),
        getTeacherDisciplineIds(session.userId, "COURSEWORK"),
      ])
    : [null, null];

  const [allStudents, semesters, disciplines, teachers] = await Promise.all([
    prisma.student.findMany({
      where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
      include: { user: true, group: true },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.semester.findMany({ orderBy: [{ course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({
      where: allowedDisciplineIds ? { id: { in: allowedDisciplineIds } } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  // Каскадные фильтры студентов
  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const oS = allStudents.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.course} курс, ${s.number} сем. (${s.academicYear})` }));
  const oD = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];
  const semesterNums = [1, 2];

  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const hasFilters = !!(studentId || params.speciality || params.course || params.group || params.semester || params.discipline || params.dateFrom || params.dateTo);

  const items = await prisma.courseWork.findMany({
    where: {
      ...(studentId ? { studentId } : filteredStudentIds.length !== allStudents.length ? { studentId: { in: filteredStudentIds } } : {}),
      ...(params.semester ? { semester: { number: parseInt(params.semester) } } : {}),
      ...(params.discipline ? { discipline: { name: params.discipline } } : {}),
      ...(params.dateFrom || params.dateTo ? {
        OR: [
          {
            date: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
            }
          },
          {
            assignedAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
            }
          }
        ]
      } : {}),
    },
    include: { student: { include: { user: true, group: true } }, semester: true, discipline: true, teacher: true },
    orderBy: [{ assignedAt: "desc" }, { date: "desc" }],
    ...(hasFilters ? {} : { take: 10 }),
  });

  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);
  if (params.semester) reportParams.set("semester", params.semester);
  if (params.discipline) reportParams.set("discipline", params.discipline);
  if (studentId) reportParams.set("studentId", studentId);
  if (params.dateFrom) reportParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) reportParams.set("dateTo", params.dateTo);

  const reportHref =
    isStudent && studentId
      ? `/print/coursework/${studentId}`
      : `/print/coursework-report?${reportParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Курсовые работы</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={reportHref} target="_blank">
              <Printer className="h-4 w-4 mr-2" />Отчёт
            </Link>
          </Button>
          {session.role === "TEACHER" && can(session, "courseWork:create") && (
            <CourseWorkForm
              students={oS} semesters={oSem} disciplines={oD} teachers={oT}
              lockTeacher={false}
              initial={{ studentId: studentId ?? undefined, teacherId: session.userId }}
              trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
            />
          )}
        </div>
      </div>

      {!isStudent && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <AutoFilterForm action="/coursework" className="grid sm:grid-cols-3 gap-3">
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
              <Sel name="semester" label="Семестр" value={params.semester ?? ""} opts={semesterNums.map((n) => ({ v: String(n), l: `${n} семестр` }))} />
              <Sel name="discipline" label="Дисциплина" value={params.discipline ?? ""} opts={disciplines.map((d) => ({ v: d.name, l: d.name }))} />
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата с</label>
                <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата по</label>
                <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="flex gap-2 items-end sm:col-span-3">
                {hasFilters && <Button type="button" variant="ghost" size="sm" asChild><Link href="/coursework">Сбросить</Link></Button>}
              </div>
            </AutoFilterForm>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            {!isStudent && <TableHead>Студент</TableHead>}
            <TableHead>Группа</TableHead>
            <TableHead>Сем.</TableHead>
            <TableHead>Дисциплина</TableHead>
            <TableHead>Тема</TableHead>
            <TableHead>Оценка</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Преподаватель</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 7 : 9} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id}>
                {!isStudent && <TableCell>{c.student.user.fullName}</TableCell>}
                <TableCell>{c.student.group.name}</TableCell>
                <TableCell className="text-center">{c.semester.number}</TableCell>
                <TableCell>{c.discipline.name}</TableCell>
                <TableCell>{c.topic}</TableCell>
                <TableCell>
                  {c.grade
                    ? <Badge variant={gradeIsPassing(c.grade) ? "success" : "destructive"}>{c.grade}</Badge>
                    : <Badge variant="outline">тема выдана</Badge>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.date ?? c.assignedAt)}</TableCell>
                <TableCell>{c.teacher.fullName}</TableCell>
                {!isStudent && (
                  <TableCell className="text-right">
                    <CourseWorkRowActions
                      id={c.id}
                      initial={{
                        studentId: c.studentId, semesterId: c.semesterId, disciplineId: c.disciplineId,
                        topic: c.topic, grade: c.grade ?? "",
                        date: c.date ? c.date.toISOString().slice(0, 10) : "",
                        teacherId: c.teacherId,
                      }}
                      students={oS} semesters={oSem} disciplines={oD} teachers={oT}
                      lockTeacher={false}
                      canEdit={can(session, "courseWork:edit")}
                      canDelete={can(session, "courseWork:delete")}
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
  const [plan, items] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.courseWork.findMany({
      where: { teacherId },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
        discipline: true,
      },
      orderBy: [{ assignedAt: "desc" }, { date: "desc" }],
    }),
  ]);

  const cwPlan = plan.filter((p) => p.kind === "COURSEWORK" && p.disciplineId && p.groupId && p.semesterId);
  const planSlots = cwPlan.map((p) => ({
    id: p.id,
    disciplineId: p.disciplineId!,
    disciplineName: p.discipline!.name,
    groupId: p.groupId!,
    groupName: p.group!.name,
    groupSpeciality: p.group!.speciality ?? "",
    semesterId: p.semesterId!,
    semesterNumber: p.semester!.number,
    semesterYear: p.semester!.academicYear,
  }));

  const planGroupIds = Array.from(new Set(cwPlan.map((p) => p.groupId!)));
  const planStudents = planGroupIds.length > 0
    ? await prisma.student.findMany({ where: { groupId: { in: planGroupIds } }, include: { user: true } })
    : [];
  const students = planStudents.map((s) => ({ id: s.id, fullName: s.user.fullName, groupId: s.groupId }));

  const rows: CourseworkRow[] = items.map((c) => ({
    id: c.id,
    topic: c.topic,
    grade: c.grade,
    date: c.date,
    assignedAt: c.assignedAt,
    studentId: c.studentId,
    studentName: c.student.user.fullName,
    groupId: c.student.group.id,
    groupName: c.student.group.name,
    groupSpeciality: c.student.group.speciality ?? "",
    disciplineId: c.disciplineId,
    disciplineName: c.discipline.name,
    semesterId: c.semesterId,
    semesterNumber: c.semester.number,
    semesterYear: c.semester.academicYear,
    course: c.semester.course,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Курсовые работы</h1>
      <TeacherCourseworkView
        rows={rows}
        planSlots={planSlots}
        students={students}
        initialFilters={initialFilters}
      />
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
