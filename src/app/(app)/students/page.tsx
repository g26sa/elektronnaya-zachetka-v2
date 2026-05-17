import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default async function StudentsPage() {
  await requireRole("TEACHER", "HEAD");
  const students = await prisma.student.findMany({
    include: { user: true, group: true, _count: { select: { assessments: true, courseWorks: true, practices: true } } },
    orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
  });

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Студенты</h1></div>
      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>ФИО</TableHead><TableHead>Группа</TableHead><TableHead>№ зач. книжки</TableHead>
            <TableHead>Курс</TableHead><TableHead className="text-right">Оценок / Курс. / Практик</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.user.fullName}</TableCell>
                <TableCell>{s.group.name}</TableCell>
                <TableCell>{s.recordBookNumber}</TableCell>
                <TableCell>{s.currentCourse}</TableCell>
                <TableCell className="text-right">
                  {s._count.assessments} / {s._count.courseWorks} / {s._count.practices}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/attestations?studentId=${s.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Открыть
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
