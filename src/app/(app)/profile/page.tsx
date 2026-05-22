import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roleLabel, formatDate } from "@/lib/utils";
import { Printer, BookOpen } from "lucide-react";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { student: { include: { group: true } } },
  });
  if (!user) return <p>Пользователь не найден.</p>;

  // Назначенные темы курсовых без оценки — отдельная карточка-уведомление
  const assignedTopics = user.student
    ? await prisma.courseWork.findMany({
        where: { studentId: user.student.id, grade: null },
        include: { discipline: true, semester: true, teacher: { select: { fullName: true } } },
        orderBy: { assignedAt: "desc" },
      })
    : [];

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

      {assignedTopics.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-700" />
              Назначенные темы курсовых работ
            </CardTitle>
            <CardDescription>
              По следующим курсовым уже выдана тема. Оценка пока не выставлена.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {assignedTopics.map((cw) => (
                <li key={cw.id} className="rounded-md border bg-white p-3">
                  <div className="font-medium">«{cw.topic}»</div>
                  <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                    <span>{cw.discipline.name}</span>
                    <span>· {cw.semester.number} семестр ({cw.semester.academicYear})</span>
                    <span>· руководитель {cw.teacher.fullName}</span>
                    {cw.assignedAt && <span>· выдана {formatDate(cw.assignedAt)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Пароль</CardTitle>
          <CardDescription>
            Чтобы сменить пароль, запросите ссылку на ваш email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/forgot-password">Сменить пароль через почту</Link>
          </Button>
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
