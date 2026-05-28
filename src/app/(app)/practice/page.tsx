import Link from "next/link";
import { requireSession } from "@/lib/auth";
import type { PracticeKind } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PracticeRowActions } from "./PracticeRowActions";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherPracticeView, type PracticeRow } from "./TeacherPracticeView";
import { formatDate, gradeIsPassing, practiceKindLabel } from "@/lib/utils";
import { Printer } from "lucide-react";
import {
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

const PRACTICE_KINDS = ["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"];

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string; speciality?: string; course?: string; group?: string;
    semester?: string; kind?: string; dateFrom?: string; dateTo?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";
  const isTeacher = session.role === "TEACHER";

  if (isTeacher) {
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

  const [allStudents, semesters, teachers] = await Promise.all([
    prisma.student.findMany({
      include: { user: true, group: true },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.semester.findMany({ orderBy: [{ course: "asc" }, { number: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const oS = allStudents.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.course} курс, ${s.number} сем. (${s.academicYear})` }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];

  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const hasFilters = !!(studentId || params.speciality || params.course || params.group || params.semester || params.kind || params.dateFrom || params.dateTo);

  const items = await prisma.practice.findMany({
    where: {
      ...(studentId ? { studentId } : filteredStudentIds.length !== allStudents.length ? { studentId: { in: filteredStudentIds } } : {}),
      ...(params.semester ? { semester: { number: parseInt(params.semester) } } : {}),
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.dateFrom || params.dateTo ? {
        startDate: {
          ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
          ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
        }
      } : {}),
    },
    include: { student: { include: { user: true, group: true } }, semester: true, instSupervisor: true },
    orderBy: { startDate: "desc" },
    ...(hasFilters ? {} : { take: 10 }),
  });

  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);
  if (params.semester) reportParams.set("semester", params.semester);
  if (params.kind) reportParams.set("kind", params.kind);
  if (studentId) reportParams.set("studentId", studentId);
  if (params.dateFrom) reportParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) reportParams.set("dateTo", params.dateTo);

  const reportHref =
    isStudent && studentId
      ? `/print/practice/${studentId}`
      : `/print/practice-report?${reportParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Практика</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={reportHref} target="_blank">
            <Printer className="h-4 w-4 mr-2" />Отчёт
          </Link>
        </Button>
      </div>

      {!isStudent && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <AutoFilterForm action="/practice" className="grid sm:grid-cols-3 gap-3">
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
              <Sel name="semester" label="Семестр" value={params.semester ?? ""} opts={[1, 2].map((n) => ({ v: String(n), l: `${n} семестр` }))} />
              <Sel name="kind" label="Вид практики" value={params.kind ?? ""} opts={PRACTICE_KINDS.map((k) => ({ v: k, l: practiceKindLabel(k) }))} />
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата начала с</label>
                <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата начала по</label>
                <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
              </div>
              <div className="flex gap-2 items-end sm:col-span-3">
                {hasFilters && <Button type="button" variant="ghost" size="sm" asChild><Link href="/practice">Сбросить</Link></Button>}
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
            <TableHead>Вид</TableHead>
            <TableHead>Место</TableHead>
            <TableHead>Период</TableHead>
            <TableHead>Оценка</TableHead>
            <TableHead>Рук. орг.</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 7 : 9} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p.id}>
                {!isStudent && <TableCell>{p.student.user.fullName}</TableCell>}
                <TableCell>{p.student.group.name}</TableCell>
                <TableCell className="text-center">{p.semester.number}</TableCell>
                <TableCell>{practiceKindLabel(p.kind)}</TableCell>
                <TableCell>{p.place}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(p.startDate)} — {formatDate(p.endDate)}</TableCell>
                <TableCell>
                  {p.grade
                    ? <Badge variant={gradeIsPassing(p.grade) ? "success" : "destructive"}>{p.grade}</Badge>
                    : <Badge variant="outline">—</Badge>}
                </TableCell>
                <TableCell>{p.orgSupervisorName ?? "—"}</TableCell>
                {!isStudent && (
                  <TableCell className="text-right">
                    <PracticeRowActions
                      id={p.id}
                      initial={{
                        studentId: p.studentId, semesterId: p.semesterId, course: p.course, kind: p.kind as PracticeKind,
                        place: p.place, hours: p.hours, creditUnits: p.creditUnits,
                        startDate: p.startDate.toISOString().slice(0, 10),
                        endDate: p.endDate.toISOString().slice(0, 10),
                        grade: p.grade ?? "", gradeDate: p.gradeDate ? p.gradeDate.toISOString().slice(0, 10) : "",
                        instSupervisorId: p.instSupervisorId,
                        orgSupervisorName: p.orgSupervisorName, orgSupervisorPosition: p.orgSupervisorPosition,
                      }}
                      students={oS} semesters={oSem} teachers={oT}
                      lockTeacher={false}
                      canEdit={can(session, "practice:edit")}
                      canDelete={can(session, "practice:delete")}
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
  const [plan, items, institution] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.practice.findMany({
      where: { instSupervisorId: teacherId },
      include: {
        student: { include: { user: true, group: true } },
        semester: true,
      },
      orderBy: [{ startDate: "desc" }],
    }),
    prisma.institution.findFirst(),
  ]);

  const prPlan = plan.filter((p) => p.kind === "PRACTICE" && p.groupId && p.semesterId);
  const planSlots = prPlan.map((p) => ({
    id: p.id,
    groupId: p.groupId!,
    groupName: p.group!.name,
    groupSpeciality: p.group!.speciality ?? "",
    semesterId: p.semesterId!,
    semesterNumber: p.semester!.number,
    semesterYear: p.semester!.academicYear,
  }));

  const planGroupIds = Array.from(new Set(prPlan.map((p) => p.groupId!)));
  const planStudents = planGroupIds.length > 0
    ? await prisma.student.findMany({ where: { groupId: { in: planGroupIds } }, include: { user: true } })
    : [];
  const students = planStudents.map((s) => ({ id: s.id, fullName: s.user.fullName, groupId: s.groupId }));

  const rows: PracticeRow[] = items.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: p.student.user.fullName,
    groupId: p.student.group.id,
    groupName: p.student.group.name,
    groupSpeciality: p.student.group.speciality ?? "",
    semesterId: p.semesterId,
    semesterNumber: p.semester.number,
    semesterYear: p.semester.academicYear,
    course: p.semester.course,
    kind: p.kind,
    place: p.place,
    startDate: p.startDate,
    endDate: p.endDate,
    grade: p.grade,
    gradeDate: p.gradeDate,
    orgSupervisorName: p.orgSupervisorName,
    orgSupervisorPosition: p.orgSupervisorPosition,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Практика</h1>
      <TeacherPracticeView
        rows={rows}
        planSlots={planSlots}
        students={students}
        institutionName={institution?.name ?? institution?.shortName ?? "Учреждение"}
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
