import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DisciplineTypeForm, DisciplineTypeDeleteButton } from "./DisciplineTypeForm";
import { Plus } from "lucide-react";

export default async function DisciplineTypesPage() {
  await requireRole("HEAD");

  // Sync Discipline → DisciplineType (from plan imports)
  const disciplines = await prisma.discipline.findMany({ orderBy: { name: "asc" } });
  for (const d of disciplines) {
    await (prisma as any).disciplineType.upsert({
      where: { name: d.name },
      update: {},
      create: { name: d.name, isActive: true, sortOrder: 0 },
    });
  }

  const items = await (prisma as any).disciplineType.findMany({ orderBy: { name: "asc" } });

  // Sync DisciplineType → Discipline (manually added items appear in plan dropdowns)
  for (const t of items) {
    await prisma.discipline.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Виды дисциплин</h1>
        </div>
        <DisciplineTypeForm
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">Справочник пуст.</TableCell></TableRow>
              ) : items.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    {t.isActive ? <Badge variant="success">да</Badge> : <Badge variant="secondary">нет</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DisciplineTypeForm
                        initial={t}
                        trigger={<Button variant="ghost" size="sm">Изменить</Button>}
                      />
                      <DisciplineTypeDeleteButton id={t.id} name={t.name} />
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
