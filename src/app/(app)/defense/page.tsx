import Link from "next/link";
import { requireSession } from "@/lib/auth";
import type { Admission } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { admissionLabel, formatDate } from "@/lib/utils";
import { DefenseForm } from "./DefenseForm";
import { TeacherDefenseView, type DefenseRow } from "./TeacherDefenseView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { Pencil, Printer } from "lucide-react";
import {
  courseFromGroupName,
  filterGroupNamesByCourse,
  filterItemsByGroupCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { AutoFilterForm } from "@/components/filters/AutoFilterForm";

export default async function DefensePage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string; speciality?: string; course?: string; group?: string;
    admission?: string; dateFrom?: string; dateTo?: string;
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

  // Student: show their own defense record
  if (session.role === "STUDENT" && studentId) {
    const [vkr, chairs] = await Promise.all([
      prisma.vKR.findUnique({
        where: { studentId },
        include: { defense: { include: { chair: true } }, supervisor: true },
      }),
      prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    ]);
    const oCh = chairs.map((c) => ({ id: c.id, label: c.fullName }));

    if (!vkr) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Защита ВКР</h1>
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Сначала назначьте тему ВКР в разделе «Выпускная квалификационная работа».</CardContent></Card>
        </div>
      );
    }

    const def = vkr.defense;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Защита ВКР</h1>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center justify-between">
            <span>Защита: {vkr.topic}</span>
            {can(session, "defense:edit") && (
              <DefenseForm
                vkrId={vkr.id}
                chairs={oCh}
                initial={def ? {
                  vkrId: vkr.id,
                  admission: def.admission as Admission,
                  admissionDate: def.admissionDate ? def.admissionDate.toISOString().slice(0, 10) : "",
                  date: def.date ? def.date.toISOString().slice(0, 10) : "",
                  grade: def.grade ?? "",
                  chairId: def.chairId ?? "",
                  protocolNumber: def.protocolNumber ?? "",
                } : { vkrId: vkr.id }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-2" />{def ? "Изменить" : "Создать"}</Button>}
              />
            )}
          </CardTitle></CardHeader>
          <CardContent>
            {def ? (
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Fld label="Допуск" v={<Badge variant={def.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(def.admission)}</Badge>} />
                <Fld label="Дата допуска" v={formatDate(def.admissionDate)} />
                <Fld label="Дата защиты" v={formatDate(def.date)} />
                <Fld label="Оценка" v={def.grade ?? "—"} />
                <Fld label="Председатель ГЭК" v={def.chair?.fullName ?? "—"} />
                <Fld label="Протокол" v={def.protocolNumber ?? "—"} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Записи о защите ещё нет.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // HEAD: table view with filters
  const [allStudents, chairs] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
  ]);

  let filteredStudents = allStudents;
  if (params.speciality) filteredStudents = filteredStudents.filter((s) => s.group.speciality === params.speciality);
  if (params.course) filteredStudents = filterItemsByGroupCourse(filteredStudents, params.course);
  if (params.group) filteredStudents = filteredStudents.filter((s) => s.group.name === params.group);

  const specialities = Array.from(new Set(allStudents.map((s) => s.group.speciality).filter(Boolean) as string[])).sort();
  const courses = uniqueCoursesFromGroupNames(allStudents.map((s) => s.group.name));
  const groups = params.course
    ? filterGroupNamesByCourse(
        (params.speciality ? filteredStudents : allStudents).map((s) => s.group.name),
        params.course
      )
    : [];

  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const hasFilters = !!(params.speciality || params.course || params.group || studentId || params.admission || params.dateFrom || params.dateTo);

  const defenses = await prisma.defense.findMany({
    where: {
      ...(studentId
        ? { vkr: { studentId } }
        : filteredStudentIds.length !== allStudents.length
          ? { vkr: { studentId: { in: filteredStudentIds } } }
          : {}),
      ...(params.admission ? { admission: params.admission } : {}),
      ...(params.dateFrom || params.dateTo ? {
        date: {
          ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
          ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
        }
      } : {}),
    },
    include: {
      vkr: { include: { student: { include: { user: true, group: true } }, supervisor: true } },
      chair: true,
    },
    orderBy: [{ vkr: { student: { group: { name: "asc" } } } }],
    ...(hasFilters ? {} : { take: 10 }),
  });

  const oCh = chairs.map((c) => ({ id: c.id, label: c.fullName }));

  const reportParams = new URLSearchParams();
  if (params.speciality) reportParams.set("speciality", params.speciality);
  if (params.course) reportParams.set("course", params.course);
  if (params.group) reportParams.set("group", params.group);
  if (studentId) reportParams.set("studentId", studentId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Защита ВКР</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/print/defense-report?${reportParams.toString()}`} target="_blank">
            <Printer className="h-4 w-4 mr-2" />Отчёт
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Фильтры</CardTitle></CardHeader>
        <CardContent>
          <AutoFilterForm action="/defense" className="grid sm:grid-cols-3 gap-3">
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
            <Sel name="studentId" label="Студент" value={studentId ?? ""} opts={filteredStudents.map((s) => ({ v: s.id, l: `${s.user.fullName} (${s.group.name})` }))} />
            <Sel name="admission" label="Допуск" value={params.admission ?? ""} opts={[{ v: "ADMITTED", l: "Допущен" }, { v: "NOT_ADMITTED", l: "Не допущен" }]} />
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата защиты с</label>
              <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground block">Дата защиты по</label>
              <input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-end sm:col-span-3">
              {hasFilters && <Button type="button" variant="ghost" size="sm" asChild><Link href="/defense">Сбросить</Link></Button>}
            </div>
          </AutoFilterForm>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        <Table className="data-table">
          <TableHeader><TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Тема ВКР</TableHead>
            <TableHead>Допуск</TableHead>
            <TableHead>Дата защиты</TableHead>
            <TableHead>Оценка</TableHead>
            <TableHead>Председатель ГЭК</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {defenses.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Записей нет.</TableCell></TableRow>
            ) : defenses.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.vkr.student.user.fullName}</TableCell>
                <TableCell>{d.vkr.student.group.name}</TableCell>
                <TableCell>{d.vkr.topic}</TableCell>
                <TableCell>
                  <Badge variant={d.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(d.admission)}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(d.date)}</TableCell>
                <TableCell>{d.grade ?? "—"}</TableCell>
                <TableCell>{d.chair?.fullName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {can(session, "defense:edit") && (
                    <DefenseForm
                      vkrId={d.vkrId}
                      chairs={oCh}
                      initial={{
                        vkrId: d.vkrId,
                        admission: d.admission as Admission,
                        admissionDate: d.admissionDate ? d.admissionDate.toISOString().slice(0, 10) : "",
                        date: d.date ? d.date.toISOString().slice(0, 10) : "",
                        grade: d.grade ?? "",
                        chairId: d.chairId ?? "",
                        protocolNumber: d.protocolNumber ?? "",
                      }}
                      trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function Fld({ label, v }: { label: string; v: React.ReactNode }) {
  return <div><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="font-medium">{v}</dd></div>;
}

async function TeacherFlow({
  teacherId,
  initialFilters,
}: {
  teacherId: string;
  initialFilters?: import("@/lib/teacher-plan-display").TeacherListFilters;
}) {
  const [plan, chairs] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.gekChair.findMany({ where: { isActive: true }, orderBy: [{ year: "desc" }, { fullName: "asc" }] }),
  ]);

  const chairPlan = plan.filter((p) => p.kind === "DEFENSE_CHAIR" && p.studentId);
  const chairStudentIds = chairPlan.map((p) => p.studentId!);

  const admittedDefenses = await prisma.defense.findMany({
    where: { admission: "ADMITTED" },
    include: {
      chair: true,
      vkr: {
        include: {
          student: { include: { user: true, group: true } },
        },
      },
    },
  });

  const accessible = admittedDefenses.filter(
    (d) =>
      d.vkr.supervisorId === teacherId ||
      chairStudentIds.includes(d.vkr.studentId)
  );

  const rows: DefenseRow[] = accessible.map((d) => {
    const s = d.vkr.student;
    const planEntry = chairPlan.find((p) => p.studentId === s.id);
    return {
      studentId: s.id,
      studentName: s.user.fullName,
      groupName: s.group.name,
      groupSpeciality: s.group.speciality ?? "",
      course: courseFromGroupName(s.group.name) ?? planEntry?.semester?.course ?? s.currentCourse,
      vkrTopic: d.vkr.topic,
      admission: d.admission,
      admissionDate: d.admissionDate,
      date: d.date,
      grade: d.grade,
      chairName: d.chair?.fullName ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Защита ВКР</h1>
      <TeacherDefenseView
        rows={rows}
        chairs={chairs.map((c) => ({ id: c.id, fullName: c.fullName }))}
        initialFilters={initialFilters}
      />
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
