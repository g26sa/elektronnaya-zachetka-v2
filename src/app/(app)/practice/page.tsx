import Link from "next/link";
import { requireSession } from "@/lib/auth";
import type { PracticeKind } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PracticeForm } from "@/components/forms/PracticeForm";
import { PracticeRowActions } from "./PracticeRowActions";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { TableFiltersBar } from "@/components/TableFiltersBar";
import { getTeacherStudentIds, getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherPracticeView, type PracticeRow } from "./TeacherPracticeView";
import { formatDate, gradeIsPassing, practiceKindLabel } from "@/lib/utils";
import { Plus, Printer } from "lucide-react";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";
  let studentId: string | null = params.studentId ?? null;
  if (isStudent) {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }
  const isTeacher = session.role === "TEACHER";

  // ─── ПРЕПОДАВАТЕЛЬ — новый flow с фильтрами и быстрой формой ───────────
  if (isTeacher) return <TeacherFlow teacherId={session.userId} />;

  const allowedStudentIds = null;

  const [students, semesters, teachers, items] = await Promise.all([
    prisma.student.findMany({
      where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
      include: { user: true, group: true },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "asc" }, { number: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    prisma.practice.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(isTeacher ? { instSupervisorId: session.userId } : {}),
      },
      include: { student: { include: { user: true } }, semester: true, instSupervisor: true },
      orderBy: { startDate: "desc" },
      ...(studentId ? {} : { take: 10 }),
    }),
  ]);
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.academicYear}, ${s.course} к., ${s.number} сем.` }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Практика</h1></div>
        <div className="flex gap-2">
          {studentId && (
            <Button asChild variant="outline">
              <Link href={`/print/practice/${studentId}`} target="_blank"><Printer className="h-4 w-4 mr-2" />Печать</Link>
            </Button>
          )}
          {can(session, "practice:create") && (
            <PracticeForm
              students={oS} semesters={oSem} teachers={oT}
              lockTeacher={session.role === "TEACHER"}
              initial={{ studentId: studentId ?? undefined, instSupervisorId: session.userId }}
              trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
            />
          )}
        </div>
      </div>

      {!isStudent && (
        <Card><CardContent className="p-4">
          <form className="flex gap-2 items-end" action="/practice" method="get">
            <select name="studentId" defaultValue={studentId ?? ""} className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— все —</option>
              {oS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent></Card>
      )}

      <TableFiltersBar
        targetSelector='table[data-search="practice"] tbody tr'
        filters={[
          { key: "course", label: "Курс" },
          { key: "semester", label: "Семестр" },
          { key: "kind", label: "Вид" },
        ]}
      />

      {!isStudent && (
        <LiveTableFilter
          targetSelector='table[data-search="practice"] tbody tr'
          placeholder="Поиск по студенту, месту, виду, руководителю…"
        />
      )}

      {!isStudent && <TableSortEnhancer targetSelector='table[data-search="practice"]' />}
      <Card><CardContent className="p-0">
        <Table className="data-table" data-search="practice">
          <TableHeader><TableRow>
            {!isStudent && <TableHead data-sort="text">Студент</TableHead>}
            <TableHead data-sort="number">Курс</TableHead><TableHead data-sort="text">Семестр</TableHead><TableHead data-sort="text">Вид</TableHead>
            <TableHead data-sort="text">Место</TableHead><TableHead>Часы / з.е.</TableHead>
            <TableHead>Период</TableHead><TableHead data-sort="text">Оценка</TableHead><TableHead data-sort="text">Рук. учр.</TableHead><TableHead data-sort="text">Рук. орг.</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 9 : 11} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow
                key={p.id}
                data-course={String(p.course)}
                data-semester={`${p.semester.academicYear}, ${p.semester.number} сем.`}
                data-kind={practiceKindLabel(p.kind)}
              >
                {!isStudent && <TableCell>{p.student.user.fullName}</TableCell>}
                <TableCell>{p.course}</TableCell>
                <TableCell className="whitespace-nowrap">{p.semester.academicYear}, {p.semester.number} сем.</TableCell>
                <TableCell>{practiceKindLabel(p.kind)}</TableCell>
                <TableCell>{p.place}</TableCell>
                <TableCell className="whitespace-nowrap">{p.hours ?? "—"} / {p.creditUnits ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(p.startDate)} — {formatDate(p.endDate)}</TableCell>
                <TableCell>
                  {p.grade
                    ? <Badge variant={gradeIsPassing(p.grade) ? "success" : "destructive"}>{p.grade}</Badge>
                    : <Badge variant="outline">не оценена</Badge>}
                </TableCell>
                <TableCell>{p.instSupervisor.fullName}</TableCell>
                <TableCell>{p.orgSupervisorName ?? "—"}</TableCell>
                {!isStudent && (
                  <TableCell className="text-right">
                    <PracticeRowActions
                      id={p.id}
                      initial={{
                        studentId: p.studentId, semesterId: p.semesterId, course: p.course, kind: p.kind as PracticeKind,
                        place: p.place, hours: p.hours, creditUnits: p.creditUnits,
                        startDate: p.startDate.toISOString().slice(0,10),
                        endDate: p.endDate.toISOString().slice(0,10),
                        grade: p.grade ?? "", gradeDate: p.gradeDate ? p.gradeDate.toISOString().slice(0,10) : "",
                        instSupervisorId: p.instSupervisorId,
                        orgSupervisorName: p.orgSupervisorName, orgSupervisorPosition: p.orgSupervisorPosition,
                      }}
                      students={oS} semesters={oSem} teachers={oT}
                      lockTeacher={session.role === "TEACHER"}
                      canEdit={can(session, "practice:edit") && (session.role !== "TEACHER" || p.instSupervisorId === session.userId)}
                      canDelete={can(session, "practice:delete") && (session.role !== "TEACHER" || p.instSupervisorId === session.userId)}
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

// ──────────────────────────────────────────────────────────────────────────
// ПРЕПОДАВАТЕЛЬ: фильтры + плоская таблица + быстрая форма + отчёт
// ──────────────────────────────────────────────────────────────────────────
async function TeacherFlow({ teacherId }: { teacherId: string }) {
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

  // План — только PRACTICE с группой+семестром
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

  // Студенты — из групп плана
  const planGroupIds = Array.from(new Set(prPlan.map((p) => p.groupId!)));
  const planStudents = planGroupIds.length > 0
    ? await prisma.student.findMany({
        where: { groupId: { in: planGroupIds } },
        include: { user: true },
      })
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
      <div>
        <h1 className="text-2xl font-semibold">Практика</h1>
      </div>
      <TeacherPracticeView
        rows={rows}
        planSlots={planSlots}
        students={students}
        institutionName={institution?.name ?? institution?.shortName ?? "Учреждение"}
      />
    </div>
  );
}
