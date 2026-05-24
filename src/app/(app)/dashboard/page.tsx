import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateAdmission } from "@/lib/admission";
import { TeacherPlanView } from "@/components/TeacherPlanView";
import { CheckCircle2, AlertTriangle, GraduationCap, Users, Clock, ClipboardList, BookOpen, Briefcase } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === "STUDENT") {
    return <StudentDashboard userId={session.userId} />;
  }
  if (session.role === "TEACHER") {
    return <TeacherDashboard userId={session.userId} />;
  }
  return <StaffDashboard role={session.role} />;
}

async function TeacherDashboard({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Главная</h1>
      <TeacherPlanView teacherId={userId} />
    </div>
  );
}

async function StudentDashboard({ userId }: { userId: string }) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      group: true,
      assessments: { include: { discipline: true, semester: true } },
      courseWorks: { include: { discipline: true } },
      _count: { select: { practices: true } },
    },
  });
  if (!student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Профиль студента не найден</CardTitle>
          <CardDescription>Обратитесь к заведующему отделением.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Упорядочиваем семестры так же, как их выводит RecordBookPage,
  // чтобы pageIndex в admission соответствовал ?page=N в зачётной книжке.
  const semestersByKey = new Map<string, { id: string; course: number; number: number; academicYear: string }>();
  for (const a of student.assessments) semestersByKey.set(a.semester.id, a.semester);
  const orderedSemesterIds = Array.from(semestersByKey.values())
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      if (a.course !== b.course) return a.course - b.course;
      return a.number - b.number;
    })
    .map((s) => s.id);

  const status = evaluateAdmission({
    assessments: student.assessments,
    courseWorks: student.courseWorks,
    orderedSemesterIds,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Главная</h1>
        <p className="text-muted-foreground">
          Группа {student.group.name} · зачётная книжка № {student.recordBookNumber}
        </p>
      </div>

      {/* Главная плитка статуса */}
      <Card className={status.kind === "admitted" ? "border-success/40" : status.kind === "not_admitted" ? "border-destructive/40" : ""}>
        <CardContent className="p-6">
          {status.kind === "admitted" && (
            <div className="flex items-start gap-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-success/10 text-success shrink-0">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-semibold text-success">Допущен</div>
              </div>
            </div>
          )}
          {status.kind === "not_admitted" && (
            <div className="flex items-start gap-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-semibold text-destructive">Не допущен</div>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Имеются непроходные оценки.
                </p>
                <ul className="text-sm space-y-1">
                  {status.failed.map((f, i) => {
                    const href =
                      f.type === "coursework"
                        ? `/coursework#${f.recordId}`
                        : `/attestations?page=${f.pageIndex ?? 0}#${f.recordId}`;
                    return (
                      <li key={i}>
                        <Link
                          href={href}
                          className="inline-flex items-center gap-2 rounded px-1 -mx-1 hover:bg-destructive/10 transition-colors"
                          title="Перейти к записи"
                        >
                          <Badge variant="destructive">{f.grade}</Badge>
                          <span>{f.discipline}</span>
                          <span className="text-xs text-muted-foreground">
                            ({f.type === "assessment" ? "аттестация" : "курсовая"})
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {status.kind === "no_data" && (
            <div className="flex items-start gap-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-muted text-muted-foreground shrink-0">
                <Clock className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="text-xl font-semibold">Записей пока нет</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Статус допуска появится после внесения оценок.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Краткая статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={ClipboardList} label="Аттестаций" value={student.assessments.length} />
        <MiniStat icon={BookOpen} label="Курсовых" value={student.courseWorks.length} />
        <MiniStat icon={Briefcase} label="Практик" value={student._count.practices} />
        <MiniStat icon={GraduationCap} label="Курс" value={student.currentCourse} />
      </div>

      {/* Быстрые ссылки */}
      <div className="grid sm:grid-cols-3 gap-4">
        <QuickLink href="/attestations" title="Зачётная книжка" hint="Промежуточная аттестация" />
        <QuickLink href="/coursework" title="Курсовые работы" hint="Темы и оценки" />
        <QuickLink href="/gia" title="Выпускная квалификационная работа" hint="Тема и защита" />
      </div>
    </div>
  );
}

async function StaffDashboard({ role }: { role: "TEACHER" | "HEAD" }) {
  const [students, totalAssessments, openVkr, teachers] = await Promise.all([
    prisma.student.count(),
    prisma.assessment.count(),
    prisma.vKR.count({ where: { defense: { is: null } } }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Главная</h1>
        <p className="text-muted-foreground">
          {role === "HEAD" ? "Заведующий отделением" : "Преподаватель"} · сводка по учреждению
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Студентов" value={students} />
        <StatCard icon={GraduationCap} label="Оценок в системе" value={totalAssessments} />
        <StatCard icon={Clock} label="ВКР без защиты" value={openVkr} />
        {role === "HEAD" && <StatCard icon={Users} label="Преподавателей" value={teachers} />}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink href="/students" title="Студенты" hint="Список и зачётные книжки" />
        <QuickLink href="/attestations" title="Аттестации" hint="Внести оценки" />
        {role === "HEAD" ? (
          <>
            <QuickLink href="/plan" title="Планы преподавателей" hint="Назначить дисциплины и нагрузку" />
            <QuickLink href="/groups" title="Группы" hint="Учебные группы" />
            <QuickLink href="/users" title="Пользователи" hint="Роли и доступ" />
            <QuickLink href="/institution" title="Учреждение" hint="Реквизиты и логотип" />
            <QuickLink href="/templates" title="Шаблоны" hint="Печатные формы" />
          </>
        ) : (
          <QuickLink href="/plan" title="Мой план" hint="Ваши дисциплины по семестрам" />
        )}
      </div>
      {role === "HEAD" && (
        <p className="text-xs text-muted-foreground">
          Планы преподавателей формируются в разделе «Планы преподавателей» — после назначений преподаватели увидят дисциплины на своей главной.
        </p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 rounded-md bg-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="grid place-items-center h-9 w-9 rounded bg-secondary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground truncate">{hint ?? label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Перейти</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
