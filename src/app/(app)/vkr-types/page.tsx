import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VkrTypeForm, VkrTypeDeleteButton } from "./VkrTypeForm";
import { Plus } from "lucide-react";

export default async function VkrTypesPage() {
  await requireRole("HEAD");
  const items = await prisma.vkrType.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Виды ВКР</h1>
        </div>
        <VkrTypeForm
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
                <TableHead>Порядок</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Справочник пуст.</TableCell></TableRow>
              ) : items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    {t.isActive ? <Badge variant="success">да</Badge> : <Badge variant="secondary">нет</Badge>}
                  </TableCell>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <VkrTypeForm
                        initial={t}
                        trigger={<Button variant="ghost" size="sm">Изменить</Button>}
                      />
                      <VkrTypeDeleteButton id={t.id} name={t.name} />
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
