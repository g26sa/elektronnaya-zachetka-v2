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
import { RecordBookPage, type RecordBookSemester } from "@/components/documents/RecordBookPage";
import { evaluateAdmission } from "@/lib/admission";
import { assessmentTypeLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus, Printer, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function AttestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  // ─── Студент ─────────────────────────────────────────────────────────────
  if (session.role === "STUDENT") {
    return <StudentView userId={session.userId} pageIndex={parseInt(params.page ?? "0", 10) || 0} />;
  }

  // ─── Преподаватель / Зав. отделением ────────────────────────────────────
  return <StaffView session={session} studentId={params.studentId ?? null} />;
}

// ──────────────────────────────────────────────────────────────────────────
// СТУДЕНТ: «зачётная книжка» с перелистыванием по семестрам
// ──────────────────────────────────────────────────────────────────────────

async function StudentView({ userId, pageIndex }: { userId: string; pageIndex: number }) {
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

  // Группируем оценки по семестрам, упорядоченным по учебному году + номеру
  const map = new Map<string, RecordBookSemester>();
  for (const a of student.assessments) {
    const key = a.semester.id;
    if (!map.has(key)) {
      map.set(key, {
        id: a.semester.id,
        course: a.semester.course,
        number: a.semester.number,
        academicYear: a.semester.academicYear,
        assessments: [],
      });
    }
    map.get(key)!.assessments.push({
      id: a.id,
      discipline: a.discipline,
      hours: a.hours,
      creditUnits: a.creditUnits,
      type: a.type,
      grade: a.grade,
      date: a.date,
      teacher: a.teacher,
    });
  }
  const semesters = Array.from(map.values()).sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
    if (a.course !== b.course) return a.course - b.course;
    return a.number - b.number;
  });

  const admission = evaluateAdmission({
    assessments: student.assessments,
    courseWorks: student.courseWorks,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
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
      <Card className={admission.kind === "admitted" ? "border-success/40" : admission.kind === "not_admitted" ? "border-destructive/40" : ""}>
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

      {semesters.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          В зачётной книжке пока нет записей.
        </CardContent></Card>
      ) : (
        <RecordBookPage
          studentName={student.user.fullName}
          group={student.group.name}
          recordBookNumber={student.recordBookNumber}
          semesters={semesters}
          currentIndex={Math.max(0, Math.min(pageIndex, semesters.length - 1))}
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
  const [students, semesters, disciplines, teachers] = await Promise.all([
    prisma.student.findMany({
      include: { user: true, group: true },
      orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
    }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "asc" }, { course: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  const studentOpts = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const semesterOpts = semesters.map((s) => ({
    id: s.id,
    label: `${s.academicYear}, ${s.course} курс, ${s.number} семестр`,
  }));
  const disciplineOpts = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const teacherOpts = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  const assessments = await prisma.assessment.findMany({
    where: studentId ? { studentId } : undefined,
    include: {
      student: { include: { user: true, group: true } },
      semester: true,
      discipline: true,
      teacher: true,
    },
    orderBy: [{ semester: { academicYear: "desc" } }, { semester: { number: "desc" } }, { date: "asc" }],
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

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Семестр</TableHead>
                <TableHead>Дисциплина</TableHead>
                <TableHead>Часы / з.е.</TableHead>
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
                        canEdit={can(session, "assessment:edit")}
                        canDelete={can(session, "assessment:delete")}
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
