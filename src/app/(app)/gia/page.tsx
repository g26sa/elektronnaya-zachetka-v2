import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VkrForm } from "./VkrForm";
import { TeacherVkrView, type VkrRow } from "./TeacherVkrView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { formatDate } from "@/lib/utils";
import { Pencil, Printer, Eye } from "lucide-react";
import {
  courseFromGroupName,
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

export default async function GiaPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string; speciality?: string; course?: string; group?: string;
    dateFrom?: string; dateTo?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  let studentId: string | null = params.studentId ?? null;
  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  if (session.role === "TEACHER") {
    const { pickTeacherListFilters } = await import("@/lib/teacher-list-filters");
    return (
      <TeacherFlow
        teacherId={session.userId}
        initialFilters={pickTeacherListFilters(params)}
      />
    );
  }

  const [allStudents, teachers] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const oS = allStudents.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];

  // Если выбран конкретный студент — показываем его карточку
  if (studentId) {
    const vkr = await prisma.vKR.findUnique({
      where: { studentId },
      include: { supervisor: true, defense: { include: { chair: true } } },
    });

    const student = allStudents.find((s) => s.id === studentId);

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Link href="/gia" className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block">← Назад к списку</Link>
            <h1 className="text-2xl font-semibold">ВКР: {student?.user.fullName}</h1>
          </div>
          <Button asChild variant="outline">
            <Link href={`/print/gia/${studentId}`} target="_blank"><Printer className="h-4 w-4 mr-2" />Печать</Link>
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center justify-between">
            <span>Тема ВКР</span>
            {can(session, "vkr:edit") && vkr && (
              <VkrForm
                students={oS} teachers={oT}
                initial={{
                  studentId,
                  topic: vkr.topic,
                  type: vkr.type ?? "",
                  approvedOrder: vkr.approvedOrder ?? "",
                  approvedDate: vkr.approvedDate ? vkr.approvedDate.toISOString().slice(0, 10) : "",
                  supervisorId: vkr.supervisorId,
                }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-2" />Изменить</Button>}
              />
            )}
          </CardTitle></CardHeader>
          <CardContent>
            {vkr ? (
              <dl className="grid sm:grid-cols-2 gap-2 text-sm">
                <div><dt className="text-muted-foreground">Тема</dt><dd className="font-medium">{vkr.topic}</dd></div>
                <div><dt className="text-muted-foreground">Вид</dt><dd>{vkr.type ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Руководитель</dt><dd>{vkr.supervisor.fullName}</dd></div>
                <div><dt className="text-muted-foreground">Приказ / дата утверждения</dt><dd>{vkr.approvedOrder ?? "—"} / {formatDate(vkr.approvedDate)}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Тема ВКР пока не назначена.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Таблица всех ВКР с фильтрами
  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const hasFilters = !!(params.speciality || params.course || params.group || params.dateFrom || params.dateTo);

  const vkrs = await prisma.vKR.findMany({
    where: {
      ...(filteredStudentIds.length !== allStudents.length ? { studentId: { in: filteredStudentIds } } : {}),
      ...(params.dateFrom || params.dateTo ? {
        approvedDate: {
          ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
          ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
        }
      } : {}),
    },
    include: { student: { include: { user: true, group: true } }, supervisor: true },
    orderBy: [{ student: { group: { name: "asc" } } }],
    ...(hasFilters ? {} : { take: 10 }),
  });

  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Выпускная квалификационная работа</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/print/vkr-report?${reportParams.toString()}`} target="_blank">
            <Printer className="h-4 w-4 mr-2" />Отчёт
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Фильтры</CardTitle></CardHeader>
        <CardContent>
          <AutoFilterForm action="/gia" className="grid sm:grid-cols-3 gap-3">
            <Sel name="speciality" label="Специальность" value={params.speciality ?? ""} opts={specialities.map((s) => ({ v: s, l: s }))} />
            <Sel name="course" label="Курс" value={params.course ?? ""} opts={courses.map((c) => ({ v: String(c), l: String(c) }))} />
            <Sel
              name="group"
              label="Группа"
              value={params.group ?? ""}
              opts={groups.map((g) => ({ v: g, l: g }))}
              disabled={!params.course}
              emptyLabel={params.course ? "— все —" : "Сначала курс"}
            />
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата утверждения с</label>
              <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата утверждения по</label>
              <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-end sm:col-span-3">
              {hasFilters && <Button type="button" variant="ghost" size="sm" asChild><Link href="/gia">Сбросить</Link></Button>}
            </div>
          </AutoFilterForm>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Тема</TableHead>
            <TableHead>Вид</TableHead>
            <TableHead>Руководитель</TableHead>
            <TableHead>Приказ / дата</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {vkrs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : vkrs.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.student.user.fullName}</TableCell>
                <TableCell>{v.student.group.name}</TableCell>
                <TableCell>{v.topic}</TableCell>
                <TableCell>{v.type ?? "—"}</TableCell>
                <TableCell>{v.supervisor.fullName}</TableCell>
                <TableCell className="whitespace-nowrap">{v.approvedOrder ?? "—"}<br /><span className="text-xs text-muted-foreground">{formatDate(v.approvedDate)}</span></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" title="Открыть карточку">
                      <Link href={`/gia?studentId=${v.studentId}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {can(session, "vkr:edit") && (
                      <VkrForm
                        students={oS} teachers={oT}
                        initial={{
                          studentId: v.studentId, topic: v.topic, type: v.type ?? "",
                          approvedOrder: v.approvedOrder ?? "",
                          approvedDate: v.approvedDate ? v.approvedDate.toISOString().slice(0, 10) : "",
                          supervisorId: v.supervisorId,
                        }}
                        trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                      />
                    )}
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

async function TeacherFlow({
  teacherId,
  initialFilters,
}: {
  teacherId: string;
  initialFilters?: import("@/lib/teacher-plan-display").TeacherListFilters;
}) {
  const [plan, vkrTypes, supervisorVkrs] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.vkrType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.vKR.findMany({
      where: { supervisorId: teacherId },
      select: { studentId: true },
    }),
  ]);

  const oV = vkrTypes.map((v) => ({ id: v.id, name: v.name }));

  const vkrPlan = plan.filter((p) => p.kind === "VKR" && p.studentId);
  const studentIds = Array.from(
    new Set([
      ...vkrPlan.map((p) => p.studentId!),
      ...supervisorVkrs.map((v) => v.studentId),
    ])
  );

  if (studentIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Выпускная квалификационная работа</h1>
        <TeacherVkrView rows={[]} vkrTypes={oV} initialFilters={initialFilters} />
      </div>
    );
  }

  const [students, vkrs] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: true, group: true },
    }),
    prisma.vKR.findMany({
      where: { studentId: { in: studentIds } },
      include: { defense: true },
    }),
  ]);
  const vkrByStudent = new Map(vkrs.map((v) => [v.studentId, v]));

  const rows: VkrRow[] = students.map((s) => {
    const v = vkrByStudent.get(s.id) ?? null;
    const planEntry = vkrPlan.find((p) => p.studentId === s.id);
    return {
      id: v?.id ?? null,
      studentId: s.id,
      studentName: s.user.fullName,
      groupId: s.group.id,
      groupName: s.group.name,
      groupSpeciality: s.group.speciality ?? "",
      course: courseFromGroupName(s.group.name) ?? planEntry?.semester?.course ?? s.currentCourse,
      topic: v?.topic ?? null,
      type: v?.type ?? null,
      approvedOrder: v?.approvedOrder ?? null,
      approvedDate: v?.approvedDate ?? null,
      admission: (v?.defense?.admission as "ADMITTED" | "NOT_ADMITTED" | null) ?? null,
      admissionDate: v?.defense?.admissionDate ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Выпускная квалификационная работа</h1>
      <TeacherVkrView rows={rows} vkrTypes={oV} initialFilters={initialFilters} />
    </div>
  );
}

function Sel({
  name, label, value, opts, disabled, emptyLabel = "— все —",
}: {
  name: string;
  label: string;
  value: string;
  opts: { v: string; l: string }[];
  disabled?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-muted-foreground block">{label}</label>
      <select
        name={name}
        defaultValue={value}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
