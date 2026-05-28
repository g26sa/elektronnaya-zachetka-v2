import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { PlanAssessmentsFilters } from "./PlanAssessmentsFilters";
import { AssessmentStudentForm } from "./AssessmentStudentForm";
import { assessmentTypeLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { ChevronLeft, Printer, Pencil } from "lucide-react";

export default async function AttestationByPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const session = await requireRole("TEACHER", "HEAD");
  const { planId } = await params;

  const plan = await prisma.teachingAssignment.findUnique({
    where: { id: planId },
    include: {
      teacher: { select: { id: true, fullName: true } },
      discipline: true,
      semester: true,
      group: {
        include: {
          students: {
            include: { user: true },
            orderBy: { user: { fullName: "asc" } },
          },
        },
      },
    },
  });
  if (!plan) notFound();
  if (plan.kind !== "ASSESSMENT") notFound();
  if (session.role === "TEACHER" && plan.teacherId !== session.userId) {
    notFound();
  }
  if (!plan.discipline || !plan.semester || !plan.group) notFound();

  const records = await prisma.assessment.findMany({
    where: {
      teacherId: plan.teacherId,
      disciplineId: plan.disciplineId!,
      semesterId: plan.semesterId!,
      student: { groupId: plan.groupId! },
    },
    orderBy: { date: "desc" },
  });

  const assessmentByStudent = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    if (!assessmentByStudent.has(r.studentId)) {
      assessmentByStudent.set(r.studentId, r);
    }
  }

  const printUrl = `/print/plan/${plan.id}`;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link href="/attestations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ChevronLeft className="h-3 w-3" /> К списку дисциплин
          </Link>
          <h1 className="text-2xl font-semibold">{plan.discipline.name}</h1>
          <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
            <span>Группа <b className="text-foreground">{plan.group.name}</b></span>
            <span>· {plan.semester.number} семестр · {plan.semester.academicYear} уч. г.</span>
            {plan.hours != null && <span>· {plan.hours} ч.</span>}
            {plan.group.speciality && <span className="truncate">· {plan.group.speciality}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Студентов в группе: {plan.group.students.length}. Оценки выставляются индивидуально.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={printUrl} target="_blank">
            <Printer className="h-4 w-4 mr-2" />
            Отчёт
          </Link>
        </Button>
      </div>

      <PlanAssessmentsFilters targetSelector='table[data-search="plan-assessments"] tbody tr' />
      <TableSortEnhancer targetSelector='table[data-search="plan-assessments"]' />

      <Card>
        <CardContent className="p-0">
          <Table className="data-table" data-search="plan-assessments">
            <TableHeader>
              <TableRow>
                <TableHead data-sort="text">Студент</TableHead>
                <TableHead data-sort="text">Форма контроля</TableHead>
                <TableHead data-sort="text">Оценка</TableHead>
                <TableHead data-sort="date">Дата</TableHead>
                <TableHead className="text-right w-[80px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.group.students.length === 0 ? (
                <TableRow data-empty="1">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    В группе нет студентов.
                  </TableCell>
                </TableRow>
              ) : (
                plan.group.students.map((s) => {
                  const a = assessmentByStudent.get(s.id);
                  return (
                    <TableRow
                      key={s.id}
                      data-grade={a ? a.grade : "нет оценки"}
                      data-date={a ? a.date.toISOString().slice(0, 10) : ""}
                    >
                      <TableCell className="font-medium">{s.user.fullName}</TableCell>
                      <TableCell>
                        {a ? assessmentTypeLabel(a.type) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {a ? (
                          <Badge variant={gradeIsPassing(a.grade) ? "success" : "destructive"}>{a.grade}</Badge>
                        ) : (
                          <Badge variant="outline">не выставлена</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {a ? formatDate(a.date) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <AssessmentStudentForm
                          planId={plan.id}
                          studentId={s.id}
                          studentName={s.user.fullName}
                          controlForm={(plan as any).controlForm ?? undefined}
                          initial={
                            a
                              ? {
                                  assessmentId: a.id,
                                  type: a.type as "EXAM" | "CREDIT" | "GRADED_CREDIT",
                                  grade: a.grade,
                                  date: a.date.toISOString().slice(0, 10),
                                }
                              : undefined
                          }
                          trigger={
                            <Button variant="ghost" size="icon" title={a ? "Редактировать оценку" : "Выставить оценку"}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
