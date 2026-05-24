import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GekChairForm, GekChairDeleteButton } from "./GekChairForm";
import { Plus } from "lucide-react";

export default async function GekChairsPage() {
  await requireRole("HEAD");
  const items = await prisma.gekChair.findMany({ orderBy: [{ year: "desc" }, { fullName: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Председатели ГЭК</h1>
        </div>
        <GekChairForm trigger={<Button><Plus className="h-4 w-4 mr-2" />Добавить</Button>} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Должность / звание</TableHead>
                <TableHead>Год</TableHead>
                <TableHead>Примечание</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Справочник пуст.</TableCell></TableRow>
              ) : items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell>{c.position ?? "—"}</TableCell>
                  <TableCell>{c.year ?? "—"}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={c.notes ?? ""}>{c.notes ?? "—"}</TableCell>
                  <TableCell>
                    {c.isActive ? <Badge variant="success">да</Badge> : <Badge variant="secondary">нет</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <GekChairForm initial={c} trigger={<Button variant="ghost" size="sm">Изменить</Button>} />
                      <GekChairDeleteButton id={c.id} fullName={c.fullName} />
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
