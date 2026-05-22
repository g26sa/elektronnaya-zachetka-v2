import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CourseWorkForm } from "@/components/forms/CourseWorkForm";
import { CourseWorkRowActions } from "./CourseWorkRowActions";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { TableFiltersBar } from "@/components/TableFiltersBar";
import { getTeacherStudentIds, getTeacherDisciplineIds, getTeacherPlan } from "@/lib/teacherPlan";
import { TeacherCourseworkView, type CourseworkRow } from "./TeacherCourseworkView";
import { formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function CourseWorkPage({
  searchParams,
}: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";
  const isTeacherRole = session.role === "TEACHER";
  let studentId: string | null = params.studentId ?? null;
  if (isStudent) {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  // ─── ПРЕПОДАВАТЕЛЬ — новый flow с фильтрами и быстрой формой ───────────
  if (isTeacherRole) {
    return <TeacherFlow teacherId={session.userId} />;
  }

  const isTeacher = session.role === "TEACHER";
  const [allowedStudentIds, allowedDisciplineIds] = isTeacher
    ? await Promise.all([
        getTeacherStudentIds(session.userId),
        getTeacherDisciplineIds(session.userId, "COURSEWORK"),
      ])
    : [null, null];

  const [students, semesters, disciplines, teachers, items] = await Promise.all([
    prisma.student.findMany({
      where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
      include: { user: true, group: true },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "asc" }, { number: "asc" }] }),
    prisma.discipline.findMany({
      where: allowedDisciplineIds ? { id: { in: allowedDisciplineIds } } : undefined,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    prisma.courseWork.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(isTeacher ? { teacherId: session.userId } : {}),
      },
      include: { student: { include: { user: true, group: true } }, semester: true, discipline: true, teacher: true },
      orderBy: [{ assignedAt: "desc" }, { date: "desc" }],
      ...(studentId ? {} : { take: 10 }),
    }),
  ]);

  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oSem = semesters.map((s) => ({ id: s.id, label: `${s.academicYear}, ${s.course} к., ${s.number} сем.` }));
  const oD = disciplines.map((d) => ({ id: d.id, label: d.name }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Курсовые работы</h1></div>
        {can(session, "courseWork:create") && (
          <CourseWorkForm
            students={oS} semesters={oSem} disciplines={oD} teachers={oT}
            lockTeacher={session.role === "TEACHER"}
            initial={{ studentId: studentId ?? undefined, teacherId: session.userId }}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
          />
        )}
      </div>

      {!isStudent && (
        <Card><CardContent className="p-4">
          <form className="flex gap-2 items-end" action="/coursework" method="get">
            <select name="studentId" defaultValue={studentId ?? ""} className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— все —</option>
              {oS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent></Card>
      )}

      <TableFiltersBar
        targetSelector='table[data-search="coursework"] tbody tr'
        filters={[
          { key: "course", label: "Курс" },
          { key: "semester", label: "Семестр" },
          { key: "discipline", label: "Дисциплина" },
        ]}
      />

      {!isStudent && (
        <LiveTableFilter
          targetSelector='table[data-search="coursework"] tbody tr'
          placeholder="Поиск по студенту, теме, дисциплине, преподавателю…"
        />
      )}

      {!isStudent && <TableSortEnhancer targetSelector='table[data-search="coursework"]' />}
      <Card><CardContent className="p-0">
        <Table className="data-table" data-search="coursework">
          <TableHeader><TableRow>
            {!isStudent && <TableHead data-sort="text">Студент</TableHead>}
            <TableHead data-sort="text">Семестр</TableHead><TableHead data-sort="text">Дисциплина</TableHead><TableHead data-sort="text">Тема</TableHead>
            <TableHead data-sort="text">Оценка</TableHead><TableHead data-sort="date">Дата</TableHead><TableHead data-sort="text">Преподаватель</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 6 : 8} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow
                key={c.id}
                id={c.id}
                data-course={String(c.semester.course)}
                data-semester={`${c.semester.academicYear}, ${c.semester.course} к., ${c.semester.number} сем.`}
                data-discipline={c.discipline.name}
              >
                {!isStudent && <TableCell>{c.student.user.fullName}</TableCell>}
                <TableCell className="whitespace-nowrap">{c.semester.academicYear}, {c.semester.course} к., {c.semester.number} сем.</TableCell>
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
                      lockTeacher={session.role === "TEACHER"}
                      canEdit={can(session, "courseWork:edit") && (session.role !== "TEACHER" || c.teacherId === session.userId)}
                      canDelete={can(session, "courseWork:delete") && (session.role !== "TEACHER" || c.teacherId === session.userId)}
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
// ПРЕПОДАВАТЕЛЬ: фильтры + плоская таблица + быстрая форма
// ──────────────────────────────────────────────────────────────────────────
async function TeacherFlow({ teacherId }: { teacherId: string }) {
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

  // план: только COURSEWORK с полным набором (дисциплина+группа+семестр)
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

  // студенты — из групп плана
  const planGroupIds = Array.from(new Set(cwPlan.map((p) => p.groupId!)));
  const planStudents = planGroupIds.length > 0
    ? await prisma.student.findMany({
        where: { groupId: { in: planGroupIds } },
        include: { user: true },
      })
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
      <div>
        <h1 className="text-2xl font-semibold">Курсовые работы</h1>
      </div>
      <TeacherCourseworkView rows={rows} planSlots={planSlots} students={students} />
    </div>
  );
}
