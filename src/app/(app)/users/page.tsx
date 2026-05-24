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
import { UsersFilterClient } from "./UsersFilterClient";
import { Plus, Pencil } from "lucide-react";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string }>;
}) {
  await requireRole("HEAD");
  const params = await searchParams;

  const roleFilter = params.role && params.role !== "" ? params.role : undefined;
  const statusFilter = params.status;

  const users = await prisma.user.findMany({
    where: {
      role: { not: "STUDENT", ...(roleFilter ? { equals: roleFilter } : {}) },
      ...(statusFilter === "active" ? { isActive: true } : statusFilter === "inactive" ? { isActive: false } : {}),
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Управление ролями</h1>
        </div>
        <UserForm trigger={<Button><Plus className="h-4 w-4 mr-2" />Создать</Button>} />
      </div>

      <UsersFilterClient initialRole={params.role ?? ""} initialStatus={params.status ?? ""} />

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Должность</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Нет пользователей по заданным фильтрам.
                </TableCell>
              </TableRow>
            ) : users.map((u) => (
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
