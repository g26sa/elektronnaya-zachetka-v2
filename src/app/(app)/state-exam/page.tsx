import { requireSession } from "@/lib/auth";
import type { Admission } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StateExamForm } from "./StateExamForm";
import { StateExamRowActions } from "./StateExamRowActions";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { TeacherStateExamView, type StateExamRow } from "./TeacherStateExamView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { admissionLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function StateExamPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const isStudent = session.role === "STUDENT";
  let studentId: string | null = params.studentId ?? null;
  if (isStudent) {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  if (session.role === "TEACHER") return <TeacherFlow teacherId={session.userId} />;
  const [students, chairs, items] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    prisma.stateExam.findMany({
      where: studentId ? { studentId } : undefined,
      include: { student: { include: { user: true } }, chair: true },
      orderBy: { date: "desc" },
    }),
  ]);
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oCh = chairs.map((c) => ({ id: c.id, label: c.fullName }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Государственный экзамен</h1></div>
        {can(session, "stateExam:edit") && (
          <StateExamForm
            students={oS} chairs={oCh}
            initial={{ studentId: studentId ?? undefined }}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
          />
        )}
      </div>

      {!isStudent && (
        <Card><CardContent className="p-4">
          <form className="flex gap-2 items-end" action="/state-exam" method="get">
            <select name="studentId" defaultValue={studentId ?? ""} className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— все —</option>
              {oS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent></Card>
      )}

      {!isStudent && (
        <LiveTableFilter
          targetSelector='table[data-search="stateExam"] tbody tr'
          placeholder="Поиск по студенту, названию, председателю…"
        />
      )}

      {!isStudent && <TableSortEnhancer targetSelector='table[data-search="stateExam"]' />}
      <Card><CardContent className="p-0">
        <Table className="data-table" data-search="stateExam">
          <TableHeader><TableRow>
            {!isStudent && <TableHead data-sort="text">Студент</TableHead>}
            <TableHead data-sort="text">Название</TableHead><TableHead data-sort="text">Допуск</TableHead><TableHead data-sort="date">Дата</TableHead>
            <TableHead data-sort="text">Оценка</TableHead><TableHead data-sort="text">Председатель ГЭК</TableHead><TableHead data-sort="text">Протокол</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 6 : 8} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((e) => (
              <TableRow key={e.id}>
                {!isStudent && <TableCell>{e.student.user.fullName}</TableCell>}
                <TableCell>{e.name}</TableCell>
                <TableCell>
                  <Badge variant={e.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(e.admission)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                <TableCell>{e.grade ? <Badge variant={gradeIsPassing(e.grade) ? "success" : "destructive"}>{e.grade}</Badge> : "—"}</TableCell>
                <TableCell>{e.chair?.fullName ?? "—"}</TableCell>
                <TableCell>{e.protocolNumber ?? "—"}</TableCell>
                {!isStudent && (
                  <TableCell className="text-right">
                    <StateExamRowActions
                      id={e.id}
                      initial={{
                        studentId: e.studentId, name: e.name, admission: e.admission as Admission,
                        admissionDate: e.admissionDate ? e.admissionDate.toISOString().slice(0,10) : "",
                        date: e.date ? e.date.toISOString().slice(0,10) : "",
                        grade: e.grade ?? "", chairId: e.chairId ?? "",
                        protocolNumber: e.protocolNumber ?? "",
                      }}
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

async function TeacherFlow({ teacherId }: { teacherId: string }) {
  const plan = await getTeacherPlan(teacherId);
  const planStudentIds = Array.from(
    new Set(plan.filter((p) => p.studentId).map((p) => p.studentId!))
  );
  // плюс группы препода — все студенты этих групп тоже видны
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
    },
    orderBy: { date: "desc" },
  });

  const rows: StateExamRow[] = items.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    studentName: e.student.user.fullName,
    groupName: e.student.group.name,
    groupSpeciality: e.student.group.speciality ?? "",
    course: e.student.currentCourse,
    name: e.name,
    admission: e.admission,
    admissionDate: e.admissionDate,
    date: e.date,
    grade: e.grade,
    chairName: e.chair?.fullName ?? null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Государственный экзамен</h1>
      </div>
      <TeacherStateExamView rows={rows} />
    </div>
  );
}
