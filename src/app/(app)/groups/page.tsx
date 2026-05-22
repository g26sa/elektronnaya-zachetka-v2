import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GroupForm } from "./GroupForm";
import { GroupRowActions } from "./GroupRowActions";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { Plus, Users } from "lucide-react";

export default async function GroupsPage() {
  await requireRole("HEAD");
  const groups = await prisma.group.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: [{ startYear: "desc" }, { name: "asc" }],
  });

  const specialities = Array.from(
    new Set(groups.map((g) => g.speciality).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Группы</h1>
          <p className="text-muted-foreground text-sm">
            Учебные группы, их специальность и год набора. Назначаются студентам в их профиле.
          </p>
        </div>
        <GroupForm
          specialities={specialities}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Создать группу</Button>}
        />
      </div>

      <LiveTableFilter
        targetSelector='table[data-search="groups"] tbody tr'
        placeholder="Поиск по названию, специальности или году набора…"
      />

      <TableSortEnhancer targetSelector='table[data-search="groups"]' />
      <Card>
        <CardContent className="p-0">
          <Table className="data-table" data-search="groups">
            <TableHeader>
              <TableRow>
                <TableHead data-sort="text">Название</TableHead>
                <TableHead data-sort="text">Специальность / направление</TableHead>
                <TableHead data-sort="number">Год набора</TableHead>
                <TableHead data-sort="number">Студентов</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow data-empty="1">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Групп пока нет. Создайте первую кнопкой выше.
                  </TableCell>
                </TableRow>
              ) : groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.speciality ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{g.startYear}</TableCell>
                  <TableCell>
                    {g._count.students > 0 ? (
                      <Link
                        href={`/students?group=${encodeURIComponent(g.name)}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {g._count.students}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <GroupRowActions
                      id={g.id}
                      initial={{ name: g.name, speciality: g.speciality, startYear: g.startYear }}
                      specialities={specialities}
                      studentCount={g._count.students}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
