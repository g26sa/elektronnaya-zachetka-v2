import Link from "next/link";
import { requireSession, type SessionPayload } from "@/lib/auth";
import type { AssessmentType } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssessmentRowActions } from "./AssessmentRowActions";
import { StudentAttestationExplorer } from "./StudentAttestationExplorer";
import { evaluateAdmission } from "@/lib/admission";
import { getTeacherStudentIds, getTeacherDisciplineIds, getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherPlanList, type PlanCardItem } from "./TeacherPlanList";
import { assessmentTypeLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import {
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

export default async function AttestationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string;
    speciality?: string;
    course?: string;
    group?: string;
    discipline?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (session.role === "STUDENT") return <StudentView userId={session.userId} />;
  if (session.role === "TEACHER") return <TeacherView teacherId={session.userId} params={params} />;
  return <StaffView session={session} params={params} />;
}

function planToCardItems(
  plan: Awaited<ReturnType<typeof getTeacherPlan>>
): PlanCardItem[] {
  return plan
    .filter((p) => p.kind === "ASSESSMENT" && p.discipline && p.group && p.semester)
    .map((p) => ({
      id: p.id,
      discipline: p.discipline!.name,
      groupName: p.group!.name,
      speciality: p.group!.speciality ?? "",
      course: p.semester!.course,
      semesterNumber: p.semester!.number,
      academicYear: p.semester!.academicYear,
      hours: p.hours,
      controlForm: (p as any).controlForm ?? null,
    }));
}

async function TeacherView({
  teacherId,
  params,
}: {
  teacherId: string;
  params: { studentId?: string };
}) {
  const [plan, allowedStudentIds] = await Promise.all([
    getTeacherPlan(teacherId),
    getTeacherStudentIds(teacherId),
  ]);
  const items = planToCardItems(plan);

  if (!params.studentId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Дисциплины</h1>
        <TeacherPlanList items={items} />
      </div>
    );
  }

  if (!allowedStudentIds.includes(params.studentId)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Дисциплины</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Студент не найден или недоступен.
          </CardContent>
        </Card>
      </div>
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: { user: true, group: true },
  });
  if (!student) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Дисциплины</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Студент не найден.</CardContent>
        </Card>
      </div>
    );
  }

  const assessments = await prisma.assessment.findMany({
    where: { studentId: student.id, teacherId },
    select: { disciplineId: true, semesterId: true },
  });

  const planIdsWithRecords = new Set<string>();
  for (const a of assessments) {
    const match = plan.find(
      (p) =>
        p.kind === "ASSESSMENT" &&
        p.disciplineId === a.disciplineId &&
        p.semesterId === a.semesterId &&
        p.groupId === student.groupId
    );
    if (match) planIdsWithRecords.add(match.id);
  }

  const filteredItems = items.filter((it) => planIdsWithRecords.has(it.id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Дисциплины</h1>
      <StudentFilterBanner
        studentName={student.user.fullName}
        groupName={student.group.name}
        recordCount={assessments.length}
      />
      <TeacherPlanList
        items={filteredItems}
        emptyMessage={
          assessments.length === 0
            ? "У этого студента пока нет записей по вашим дисциплинам."
            : "Нет дисциплин в вашем плане, соответствующих записям студента."
        }
      />
    </div>
  );
}

function StudentFilterBanner({
  studentName,
  groupName,
  recordCount,
  resetHref = "/attestations",
}: {
  studentName: string;
  groupName: string;
  recordCount: number;
  resetHref?: string;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Фильтр по студенту: </span>
          <span className="font-semibold">{studentName}</span>
          <span className="text-muted-foreground"> · {groupName}</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={resetHref}>Сбросить фильтр</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function StudentView({ userId }: { userId: string }) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      group: true,
      assessments: {
        include: { discipline: true, semester: true, teacher: true },
        orderBy: { date: "asc" },
      },
      courseWorks: { include: { discipline: true } },
    },
  });
  if (!student) return <p>Профиль студента не найден.</p>;

  const admission = evaluateAdmission({
    assessments: student.assessments,
    courseWorks: student.courseWorks,
  });

  const flatAssessments = student.assessments.map((a) => ({
    id: a.id,
    discipline: { name: a.discipline.name },
    hours: a.hours,
    type: a.type,
    grade: a.grade,
    date: a.date.toISOString(),
    teacher: { fullName: a.teacher.fullName },
    semester: {
      id: a.semester.id,
      course: a.semester.course,
      number: a.semester.number,
      academicYear: a.semester.academicYear,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap no-print">
        <div>
          <h1 className="text-2xl font-semibold">Зачётная книжка</h1>
          <p className="text-muted-foreground text-sm">Дисциплины · {student.user.fullName}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/print/attestation/${student.id}`} target="_blank">
            <Printer className="h-4 w-4 mr-2" />Печать / PDF
          </Link>
        </Button>
      </div>

      <Card className={"no-print " + (admission.kind === "admitted" ? "border-success/40" : admission.kind === "not_admitted" ? "border-destructive/40" : "")}>
        <CardContent className="p-4">
          {admission.kind === "admitted" && (
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <div className="font-semibold">Допущен</div>
            </div>
          )}
          {admission.kind === "not_admitted" && (
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div className="font-semibold">Не допущен</div>
              <span className="text-sm text-muted-foreground">— имеются непроходные оценки ({admission.failed.length})</span>
            </div>
          )}
          {admission.kind === "no_data" && (
            <div className="text-sm text-muted-foreground">Записей пока нет.</div>
          )}
        </CardContent>
      </Card>

      {flatAssessments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">В зачётной книжке пока нет записей.</CardContent></Card>
      ) : (
        <StudentAttestationExplorer
          studentName={student.user.fullName}
          group={student.group.name}
          recordBookNumber={student.recordBookNumber}
          assessments={flatAssessments}
        />
      )}
    </div>
  );
}

async function StaffView({
  session,
  params,
}: {
  session: SessionPayload;
  params: {
    studentId?: string;
    speciality?: string;
    course?: string;
    group?: string;
    discipline?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const isTeacher = session.role === "TEACHER";
  const [allowedStudentIds, allowedDisciplineIds] = isTeacher
    ? await Promise.all([
        getTeacherStudentIds(session.userId),
        getTeacherDisciplineIds(session.userId, "ASSESSMENT"),
      ])
    : [null, null];

  const [allStudents, disciplines, teachers] = await Promise.all([
    prisma.student.findMany({
      where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
      include: { user: true, group: true },
      orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
    }),
    prisma.discipline.findMany({
      where: allowedDisciplineIds ? { id: { in: allowedDisciplineIds } } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  // Каскадные фильтры для студентов
  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const studentOpts = allStudents.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const disciplineOpts = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const teacherOpts = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  // Уникальные значения для фильтров
  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];

  const filteredStudentIds = filteredStudents.map((s) => s.id);

  // Строим условие запроса
  const where: Record<string, unknown> = {
    ...(params.studentId ? { studentId: params.studentId } : filteredStudentIds.length !== allStudents.length ? { studentId: { in: filteredStudentIds } } : {}),
    ...(isTeacher ? { teacherId: session.userId } : {}),
    ...(params.discipline ? { discipline: { name: params.discipline } } : {}),
    ...(params.dateFrom || params.dateTo ? {
      date: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
      }
    } : {}),
  };

  const hasFilters = !!(params.studentId || params.speciality || params.course || params.group || params.discipline || params.dateFrom || params.dateTo);

  const filterStudent = params.studentId
    ? allStudents.find((s) => s.id === params.studentId)
    : undefined;

  const assessments = await prisma.assessment.findMany({
    where,
    include: {
      student: { include: { user: true, group: true } },
      semester: true,
      discipline: true,
      teacher: true,
    },
    orderBy: [{ date: "desc" }],
    ...(hasFilters ? {} : { take: 10 }),
  });

  // Параметры для ссылки на отчёт
  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);
  if (params.studentId) reportParams.set("studentId", params.studentId);
  if (params.discipline) reportParams.set("discipline", params.discipline);
  if (params.dateFrom) reportParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) reportParams.set("dateTo", params.dateTo);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Дисциплины</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/print/attestation-report?${reportParams.toString()}`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />Отчёт
            </Link>
          </Button>
        </div>
      </div>

      {filterStudent && (
        <StudentFilterBanner
          studentName={filterStudent.user.fullName}
          groupName={filterStudent.group.name}
          recordCount={assessments.length}
          resetHref="/attestations"
        />
      )}

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <AutoFilterForm action="/attestations" className="grid sm:grid-cols-3 gap-3">
            <FilterSelect name="speciality" label="Специальность" value={params.speciality ?? ""} options={specialities} />
            <FilterSelect name="course" label="Курс" value={params.course ?? ""} options={courses.map(String)} />
            <FilterSelect
              name="group"
              label="Группа"
              value={params.group ?? ""}
              options={groups}
              disabled={!params.course}
              emptyLabel={params.course ? "— все —" : "Сначала выберите курс"}
            />
            <FilterSelect name="studentId" label="Студент" value={params.studentId ?? ""}
              options={filteredStudents.map((s) => ({ value: s.id, label: `${s.user.fullName} (${s.group.name})` }))}
              emptyLabel="— все —" />
            <FilterSelect name="discipline" label="Дисциплина" value={params.discipline ?? ""}
              options={disciplines.map((d) => d.name)} />
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата с</label>
              <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата по</label>
              <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-end sm:col-span-3">
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href="/attestations">Сбросить</Link>
                </Button>
              )}
            </div>
          </AutoFilterForm>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Студент</TableHead>
                <TableHead>Группа</TableHead>
                <TableHead>Семестр</TableHead>
                <TableHead>Дисциплина</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Преподаватель</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Записей пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.student.user.fullName}</TableCell>
                    <TableCell>{a.student.group.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {a.semester.course}к, {a.semester.number} сем.
                    </TableCell>
                    <TableCell>{a.discipline.name}</TableCell>
                    <TableCell>{assessmentTypeLabel(a.type)}</TableCell>
                    <TableCell>
                      <Badge variant={gradeIsPassing(a.grade) ? "success" : "destructive"}>{a.grade}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(a.date)}</TableCell>
                    <TableCell>{a.teacher.fullName}</TableCell>
                    <TableCell className="text-right">
                      <AssessmentRowActions
                        id={a.id}
                        initial={{
                          studentId: a.studentId,
                          semesterId: a.semesterId,
                          disciplineId: a.disciplineId,
                          type: a.type as AssessmentType,
                          grade: a.grade,
                          hours: a.hours,
                          creditUnits: a.creditUnits,
                          date: a.date.toISOString().slice(0, 10),
                          teacherId: a.teacherId,
                          protocolNumber: a.protocolNumber,
                        }}
                        students={studentOpts}
                        semesters={[]}
                        disciplines={disciplineOpts}
                        teachers={teacherOpts}
                        canEdit={can(session, "assessment:edit") && (session.role !== "TEACHER" || a.teacherId === session.userId)}
                        canDelete={can(session, "assessment:delete") && (session.role !== "TEACHER" || a.teacherId === session.userId)}
                        lockTeacher={session.role === "TEACHER"}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({
  name, label, value, options, emptyLabel = "— все —", disabled,
}: {
  name: string;
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
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
        {normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
