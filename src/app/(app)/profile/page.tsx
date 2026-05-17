import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roleLabel, formatDate } from "@/lib/utils";
import { Pencil, Printer } from "lucide-react";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { student: { include: { group: true } } },
  });
  if (!user) return <p>Пользователь не найден.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <p className="text-muted-foreground">{roleLabel(user.role)}</p>
        </div>
        {user.student && (
          <Button asChild variant="outline">
            <Link href={`/print/record-book/${user.student.id}`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />
              Печать зачётной книжки
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field label="ФИО" value={user.fullName} />
            <Field label="Email" value={user.email} />
            <Field label="Роль" value={roleLabel(user.role)} />
            {user.position && <Field label="Должность" value={user.position} />}
            {user.student && (
              <>
                <Field label="Группа" value={user.student.group.name} />
                <Field label="Специальность" value={user.student.group.speciality ?? "—"} />
                <Field label="Номер зачётной книжки" value={user.student.recordBookNumber} />
                <Field label="Дата рождения" value={formatDate(user.student.birthDate)} />
                <Field label="Дата зачисления" value={formatDate(user.student.enrollmentDate)} />
                <Field label="Приказ о зачислении" value={user.student.enrollmentOrder ?? "—"} />
                <Field label="Текущий курс" value={String(user.student.currentCourse)} />
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
