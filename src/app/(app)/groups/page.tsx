import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GroupRowActions } from "./GroupRowActions";
import { GroupImportDialog } from "./GroupImportDialog";
import { GroupsFilterClient } from "./GroupsFilterClient";
import { GroupForm } from "./GroupForm";
import { Users, Plus } from "lucide-react";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string; course?: string; group?: string; year?: string }>;
}) {
  await requireRole("HEAD");
  const params = await searchParams;

  const allGroups = await prisma.group.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: [{ startYear: "desc" }, { name: "asc" }],
  });

  const specialities = Array.from(
    new Set(allGroups.map((g) => g.speciality).filter(Boolean) as string[])
  ).sort();

  const years = Array.from(new Set(allGroups.map((g) => g.startYear))).sort((a, b) => b - a);

  // Фильтрация
  let groups = allGroups;
  if (params.speciality) groups = groups.filter((g) => g.speciality === params.speciality);
  if (params.year) groups = groups.filter((g) => String(g.startYear) === params.year);
  if (params.group) groups = groups.filter((g) => g.name.toLowerCase().includes(params.group!.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Группы</h1>
        <GroupForm
          specialities={specialities}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />Новая группа
            </Button>
          }
        />
      </div>

      <GroupsFilterClient
        initialSpeciality={params.speciality ?? ""}
        initialYear={params.year ?? ""}
        initialGroup={params.group ?? ""}
        specialities={specialities}
        years={years.map(String)}
      />

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Специальность</TableHead>
                <TableHead>Год набора</TableHead>
                <TableHead>Студентов</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Групп пока нет. Импортируйте студентов через Excel.
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
                        className="underline-offset-2 hover:underline text-primary"
                      >
                        {g._count.students} →
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <GroupImportDialog groupId={g.id} groupName={g.name} />
                      <GroupRowActions
                        id={g.id}
                        initial={{ name: g.name, speciality: g.speciality, startYear: g.startYear }}
                        specialities={specialities}
                        studentCount={g._count.students}
                      />
                    </div>
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
