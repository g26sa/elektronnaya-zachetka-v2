import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableFiltersBar } from "@/components/TableFiltersBar";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { QuickAddForm } from "./QuickAddForm";
import { assessmentTypeLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { ChevronLeft, Plus, Printer } from "lucide-react";

export default async function AttestationByPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const session = await requireRole("TEACHER", "HEAD");
  const { planId } = await params;

  const plan = await prisma.teachingAssignment.findUnique({
    where: { id: planId },
    include: {
      teacher: { select: { id: true, fullName: true } },
      discipline: true,
      semester: true,
      group: { include: { students: { include: { user: true } } } },
    },
  });
  if (!plan) notFound();
  if (plan.kind !== "ASSESSMENT") notFound();
  if (session.role === "TEACHER" && plan.teacherId !== session.userId) {
    notFound();
  }
  if (!plan.discipline || !plan.semester || !plan.group) notFound();

  // Все оценки этого преподавателя по этой дисциплине, семестру и группе плана
  const records = await prisma.assessment.findMany({
    where: {
      teacherId: plan.teacherId,
      disciplineId: plan.disciplineId!,
      semesterId: plan.semesterId!,
      student: { groupId: plan.groupId! },
    },
    include: { student: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  const students = plan.group.students
    .map((s) => ({ id: s.id, label: s.user.fullName }))
    .sort((a, b) => a.label.localeCompare(b.label, "ru"));

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
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={printUrl} target="_blank">
              <Printer className="h-4 w-4 mr-2" />
              Отчёт
            </Link>
          </Button>
          <QuickAddForm
            planId={plan.id}
            students={students}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
          />
        </div>
      </div>

      <TableFiltersBar
        targetSelector='table[data-search="plan-assessments"] tbody tr'
        filters={[
          { key: "student", label: "Студент" },
          { key: "type", label: "Форма контроля" },
        ]}
      />
      <LiveTableFilter
        targetSelector='table[data-search="plan-assessments"] tbody tr'
        placeholder="Поиск по студенту, оценке, дате…"
      />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow data-empty="1">
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    По этой дисциплине пока нет выставленных оценок.
                  </TableCell>
                </TableRow>
              ) : records.map((r) => (
                <TableRow key={r.id} data-student={r.student.user.fullName} data-type={assessmentTypeLabel(r.type)}>
                  <TableCell>{r.student.user.fullName}</TableCell>
                  <TableCell>{assessmentTypeLabel(r.type)}</TableCell>
                  <TableCell>
                    <Badge variant={gradeIsPassing(r.grade) ? "success" : "destructive"}>{r.grade}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
