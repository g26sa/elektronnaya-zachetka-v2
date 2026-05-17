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
  const [students, semesters, teachers, items] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.semester.findMany({ orderBy: [{ academicYear: "asc" }, { number: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    prisma.practice.findMany({
      where: studentId ? { studentId } : undefined,
      include: { student: { include: { user: true } }, semester: true, instSupervisor: true },
      orderBy: { startDate: "desc" },
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

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            {!isStudent && <TableHead>Студент</TableHead>}
            <TableHead>Курс</TableHead><TableHead>Семестр</TableHead><TableHead>Вид</TableHead>
            <TableHead>Место</TableHead><TableHead>Часы / з.е.</TableHead>
            <TableHead>Период</TableHead><TableHead>Оценка</TableHead><TableHead>Рук. учр.</TableHead><TableHead>Рук. орг.</TableHead>
            {!isStudent && <TableHead className="text-right">Действия</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={isStudent ? 9 : 11} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p.id}>
                {!isStudent && <TableCell>{p.student.user.fullName}</TableCell>}
                <TableCell>{p.course}</TableCell>
                <TableCell className="whitespace-nowrap">{p.semester.academicYear}, {p.semester.number} сем.</TableCell>
                <TableCell>{practiceKindLabel(p.kind)}</TableCell>
                <TableCell>{p.place}</TableCell>
                <TableCell className="whitespace-nowrap">{p.hours ?? "—"} / {p.creditUnits ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(p.startDate)} — {formatDate(p.endDate)}</TableCell>
                <TableCell><Badge variant={gradeIsPassing(p.grade) ? "success" : "destructive"}>{p.grade}</Badge></TableCell>
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
                        grade: p.grade, gradeDate: p.gradeDate.toISOString().slice(0,10),
                        instSupervisorId: p.instSupervisorId,
                        orgSupervisorName: p.orgSupervisorName, orgSupervisorPosition: p.orgSupervisorPosition,
                      }}
                      students={oS} semesters={oSem} teachers={oT}
                      canEdit={can(session, "practice:edit")} canDelete={can(session, "practice:delete")}
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
