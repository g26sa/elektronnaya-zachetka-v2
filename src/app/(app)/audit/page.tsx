import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AuditPage() {
  const session = await requireSession();
  // Студент / преподаватель видят только свои события; зав. отделением — все.
  const filter: Prisma.AuditLogWhereInput | undefined =
    session.role === "HEAD" ? undefined : { userId: session.userId };

  const logs = await prisma.auditLog.findMany({
    where: filter,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">История изменений</h1>
      </div>
      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>Дата/время</TableHead><TableHead>Пользователь</TableHead><TableHead>Действие</TableHead>
            <TableHead>Сущность</TableHead><TableHead>ID объекта</TableHead><TableHead>Изменения</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет событий.</TableCell></TableRow>
            ) : logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">{l.createdAt.toLocaleString("ru-RU")}</TableCell>
                <TableCell>{l.user?.fullName ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                <TableCell>{l.entity}</TableCell>
                <TableCell><code className="text-xs">{l.entityId ?? "—"}</code></TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={l.diff ?? ""}>
                  {l.diff ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
