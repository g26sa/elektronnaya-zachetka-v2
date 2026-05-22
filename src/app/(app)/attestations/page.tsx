import Link from "next/link";
import { requireSession, type SessionPayload } from "@/lib/auth";
import type { AssessmentType } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssessmentForm } from "@/components/forms/AssessmentForm";
import { AssessmentRowActions } from "./AssessmentRowActions";
import { StudentAttestationExplorer } from "./StudentAttestationExplorer";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { evaluateAdmission } from "@/lib/admission";
import { getTeacherStudentIds, getTeacherDisciplineIds, getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherPlanList, type PlanCardItem } from "./TeacherPlanList";
import { assessmentTypeLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus, Printer, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function AttestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  // ─── Студент ─────────────────────────────────────────────────────────────
  if (session.role === "STUDENT") {
    return <StudentView userId={session.userId} />;
  }

  // ─── Преподаватель: список карточек дисциплин из плана ───────────────────
  if (session.role === "TEACHER") {
    return <TeacherView teacherId={session.userId} />;
  }

  // ─── Зав. отделением: классическая таблица всех записей ─────────────────
  return <StaffView session={session} studentId={params.studentId ?? null} />;
}

// ──────────────────────────────────────────────────────────────────────────
// ПРЕПОДАВАТЕЛЬ: список дисциплин из плана (ASSESSMENT)
// ──────────────────────────────────────────────────────────────────────────

async function TeacherView({ teacherId }: { teacherId: string }) {
  const plan = await getTeacherPlan(teacherId);
  const items: PlanCardItem[] = plan
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
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Промежуточная аттестация</h1>
      </div>
      <TeacherPlanList items={items} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// СТУДЕНТ: зачётная книжка с фильтрами сверху, вертикальный стек семестров
// ──────────────────────────────────────────────────────────────────────────

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

  // Передаём в клиентский Explorer в сериализуемом виде
  const flatAssessments = student.assessments.map((a) => ({
    id: a.id,
    discipline: { name: a.discipline.name },
    hours: a.hours,
    creditUnits: a.creditUnits,
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
          <p className="text-muted-foreground text-sm">
            Промежуточная аттестация · {student.user.fullName}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/print/attestation/${student.id}`} target="_blank">
            <Printer className="h-4 w-4 mr-2" />
            Печать / PDF
          </Link>
        </Button>
      </div>

      {/* Статус допуска */}
      <Card
        className={
          "no-print " +
          (admission.kind === "admitted"
            ? "border-success/40"
            : admission.kind === "not_admitted"
            ? "border-destructive/40"
            : "")
        }
      >
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
              <span className="text-sm text-muted-foreground">
                — имеются непроходные оценки ({admission.failed.length})
              </span>
            </div>
          )}
          {admission.kind === "no_data" && (
            <div className="text-sm text-muted-foreground">Записей пока нет.</div>
          )}
        </CardContent>
      </Card>

      {flatAssessments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          В зачётной книжке пока нет записей.
        </CardContent></Card>
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

// ──────────────────────────────────────────────────────────────────────────
// СОТРУДНИКИ: обычная таблица с CRUD
// ──────────────────────────────────────────────────────────────────────────

async function StaffView({
  session,
  studentId,
}: {
  session: SessionPayload;
  studentId: string | null;
}) {
  const isTeacher = session.role === "TEACHER";
  // Преподаватель видит только своих студентов и свои дисциплины — из плана.
  const [allowedStudentIds, allowedDisciplineIds] = isTeacher
    ? await Promise.all([
        getTeacherStudentIds(session.userId),
        getTeacherDisciplineIds(session.userId, "ASSESSMENT"),
      ])
    : [null, null];

  const [students, semesters, disciplines, teachers] = await Promise.all([
    prisma.student.findMany({
      where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
      include: { user: true, group: true },
      orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
    }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "asc" }, { course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({
      where: allowedDisciplineIds ? { id: { in: allowedDisciplineIds } } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  const studentOpts = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const semesterOpts = semesters.map((s) => ({
    id: s.id,
    label: `${s.academicYear}, ${s.course} курс, ${s.number} семестр`,
  }));
  const disciplineOpts = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const teacherOpts = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  // Преподаватель видит только записи, где он сам преподаватель.
  // Все: фильтр по студенту, если выбран.
  const assessments = await prisma.assessment.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(isTeacher ? { teacherId: session.userId } : {}),
    },
    include: {
      student: { include: { user: true, group: true } },
      semester: true,
      discipline: true,
      teacher: true,
    },
    orderBy: [{ date: "desc" }],
    // Без фильтра по студенту — отдаём только 10 последних
    ...(studentId ? {} : { take: 10 }),
  });

  const studentName = studentId ? students.find((s) => s.id === studentId)?.user.fullName : "Все студенты";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Промежуточная аттестация</h1>
          <p className="text-muted-foreground">{studentName ?? "Выберите студента"}</p>
        </div>
        <div className="flex gap-2">
          {studentId && (
            <Button asChild variant="outline">
              <Link href={`/print/attestation/${studentId}`} target="_blank">
                <Printer className="h-4 w-4 mr-2" />
                Печать отчёта
              </Link>
            </Button>
          )}
          {can(session, "assessment:create") && (
            <AssessmentForm
              students={studentOpts}
              semesters={semesterOpts}
              disciplines={disciplineOpts}
              teachers={teacherOpts}
              lockTeacher={session.role === "TEACHER"}
              initial={{ studentId: studentId ?? undefined, teacherId: session.userId }}
              trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Выбор студента</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2 items-end" action="/attestations" method="get">
            <select
              name="studentId"
              defaultValue={studentId ?? ""}
              className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— все —</option>
              {studentOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent>
      </Card>

      <LiveTableFilter
        targetSelector='table[data-search="assessments"] tbody tr'
        placeholder="Поиск по дисциплине, семестру, оценке или преподавателю…"
      />

      <TableSortEnhancer targetSelector='table[data-search="assessments"]' />
      <Card>
        <CardContent className="p-0">
          <Table className="data-table" data-search="assessments">
            <TableHeader>
              <TableRow>
                <TableHead data-sort="text">Семестр</TableHead>
                <TableHead data-sort="text">Дисциплина</TableHead>
                <TableHead>Часы / з.е.</TableHead>
                <TableHead data-sort="text">Тип</TableHead>
                <TableHead data-sort="text">Оценка</TableHead>
                <TableHead data-sort="date">Дата</TableHead>
                <TableHead data-sort="text">Преподаватель</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Записей пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      {a.semester.academicYear} · {a.semester.course} к. · {a.semester.number} сем.
                    </TableCell>
                    <TableCell>{a.discipline.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {a.hours ?? "—"} / {a.creditUnits ?? "—"}
                    </TableCell>
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
                        semesters={semesterOpts}
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
