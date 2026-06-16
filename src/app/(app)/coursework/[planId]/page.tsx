import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { CourseWorkStudentForm } from "./CourseWorkStudentForm";
import { formatDate, gradeIsPassing } from "@/lib/utils";

export default async function CourseWorkByPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const session = await requireSession();
  const { planId } = await params;

  const plan = await prisma.teachingAssignment.findUnique({
    where: { id: planId },
    include: {
      discipline: true,
      semester: true,
      group: {
        include: {
          students: { include: { user: true }, orderBy: { user: { fullName: "asc" } } },
        },
      },
    },
  });

  if (!plan || plan.kind !== "COURSEWORK") notFound();
  if (!plan.discipline || !plan.semester || !plan.group) notFound();
  if (session.role === "TEACHER" && plan.teacherId !== session.userId) notFound();

  const records = await prisma.courseWork.findMany({
    where: {
      teacherId: plan.teacherId,
      disciplineId: plan.disciplineId!,
      semesterId: plan.semesterId!,
      student: { groupId: plan.groupId! },
    },
  });

  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  const planContext = {
    semesterId: plan.semesterId!,
    disciplineId: plan.disciplineId!,
    groupId: plan.groupId!,
  };

  const graded = records.filter((r) => r.grade).length;
  const topicOnly = records.filter((r) => !r.grade).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link href="/coursework" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ChevronLeft className="h-3 w-3" /> К списку курсовых
          </Link>
          <h1 className="text-2xl font-semibold">{plan.discipline.name}</h1>
          <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
            <span>Группа <b className="text-foreground">{plan.group.name}</b></span>
            <span>· {plan.semester.number} семестр · {plan.semester.academicYear} уч. г.</span>
            {plan.group.speciality && <span className="truncate">· {plan.group.speciality}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Студентов: {plan.group.students.length} · с оценкой: {graded} · тема выдана: {topicOnly}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Студент</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Дата выдачи темы</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Дата оценки</TableHead>
                <TableHead className="text-right w-[80px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.group.students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    В группе нет студентов.
                  </TableCell>
                </TableRow>
              ) : plan.group.students.map((s) => {
                const cw = byStudent.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.user.fullName}</TableCell>
                    <TableCell>
                      {cw?.topic ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cw?.assignedAt ? formatDate(cw.assignedAt) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {cw?.grade ? (
                        <Badge variant={gradeIsPassing(cw.grade) ? "success" : "destructive"}>{cw.grade}</Badge>
                      ) : cw ? (
                        <Badge variant="outline">тема выдана</Badge>
                      ) : (
                        <Badge variant="secondary">нет записи</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cw?.date ? formatDate(cw.date) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <CourseWorkStudentForm
                        studentName={s.user.fullName}
                        studentId={s.id}
                        planContext={planContext}
                        initial={cw ? {
                          id: cw.id,
                          topic: cw.topic,
                          grade: cw.grade ?? "",
                          date: cw.date ? new Date(cw.date).toISOString().slice(0, 10) : "",
                          assignedAt: cw.assignedAt ? new Date(cw.assignedAt).toISOString().slice(0, 10) : "",
                        } : undefined}
                        trigger={
                          <Button variant="ghost" size="icon" title={cw ? "Редактировать" : "Выдать тему"}>
                            {cw ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
