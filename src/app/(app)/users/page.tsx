import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/types/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/utils";
import { UserForm } from "./UserForm";
import { ToggleActive } from "./ToggleActive";
import { LiveTableFilter } from "@/components/LiveTableFilter";
import { TableSortEnhancer } from "@/components/TableSortEnhancer";
import { Plus, Pencil } from "lucide-react";

export default async function UsersPage() {
  await requireRole("HEAD");
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { fullName: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Управление пользователями и ролями</h1>
          <p className="text-muted-foreground text-sm">Студенты, преподаватели, заведующие отделением</p>
        </div>
        <UserForm trigger={<Button><Plus className="h-4 w-4 mr-2" />Создать</Button>} />
      </div>

      <LiveTableFilter
        targetSelector='table[data-search="users"] tbody tr'
        placeholder="Поиск по ФИО, email, роли или должности…"
      />

      <TableSortEnhancer targetSelector='table[data-search="users"]' />
      <Card><CardContent className="p-0">
        <Table className="data-table" data-search="users">
          <TableHeader><TableRow>
            <TableHead data-sort="text">ФИО</TableHead><TableHead data-sort="text">Email</TableHead><TableHead data-sort="text">Роль</TableHead>
            <TableHead data-sort="text">Должность</TableHead><TableHead data-sort="text">Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant="outline">{roleLabel(u.role)}</Badge></TableCell>
                <TableCell>{u.position ?? "—"}</TableCell>
                <TableCell>
                  {u.isActive ? <Badge variant="success">Активен</Badge> : <Badge variant="secondary">Отключён</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <UserForm
                      id={u.id}
                      initial={{
                        email: u.email, fullName: u.fullName, role: u.role as Role,
                        position: u.position ?? "", isActive: u.isActive,
                      }}
                      trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <ToggleActive id={u.id} isActive={u.isActive} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
