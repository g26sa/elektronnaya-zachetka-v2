import { requireSession } from "@/lib/auth";
import type { Admission } from "@/types/enums";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { admissionLabel, formatDate } from "@/lib/utils";
import { DefenseForm } from "./DefenseForm";
import { TeacherDefenseView, type DefenseRow } from "./TeacherDefenseView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { Pencil } from "lucide-react";

export default async function DefensePage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  let studentId: string | null = params.studentId ?? null;
  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  if (session.role === "TEACHER") return <TeacherFlow teacherId={session.userId} />;
  const [students, chairs, vkr] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    studentId
      ? prisma.vKR.findUnique({ where: { studentId }, include: { defense: { include: { chair: true } }, supervisor: true } })
      : null,
  ]);
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oCh = chairs.map((c) => ({ id: c.id, label: c.fullName }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Защита ВКР</h1></div>

      {session.role !== "STUDENT" && (
        <Card><CardContent className="p-4">
          <form className="flex gap-2 items-end" action="/defense" method="get">
            <select name="studentId" defaultValue={studentId ?? ""} className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— выберите студента —</option>
              {oS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent></Card>
      )}

      {!vkr ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Сначала назначьте тему ВКР в разделе «Выпускная квалификационная работа».</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center justify-between">
            <span>Защита: {vkr.topic}</span>
            {can(session, "defense:edit") && (
              <DefenseForm
                vkrId={vkr.id}
                chairs={oCh}
                initial={vkr.defense ? {
                  vkrId: vkr.id,
                  admission: vkr.defense.admission as Admission,
                  admissionDate: vkr.defense.admissionDate ? vkr.defense.admissionDate.toISOString().slice(0,10) : "",
                  date: vkr.defense.date ? vkr.defense.date.toISOString().slice(0,10) : "",
                  grade: vkr.defense.grade ?? "",
                  chairId: vkr.defense.chairId ?? "",
                  protocolNumber: vkr.defense.protocolNumber ?? "",
                } : { vkrId: vkr.id }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-2" />{vkr.defense ? "Изменить" : "Создать"}</Button>}
              />
            )}
          </CardTitle></CardHeader>
          <CardContent>
            {vkr.defense ? (
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Fld label="Допуск" v={
                  <Badge variant={vkr.defense.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(vkr.defense.admission)}</Badge>
                } />
                <Fld label="Дата допуска" v={formatDate(vkr.defense.admissionDate)} />
                <Fld label="Дата защиты" v={formatDate(vkr.defense.date)} />
                <Fld label="Оценка" v={vkr.defense.grade ?? "—"} />
                <Fld label="Председатель ГЭК" v={vkr.defense.chair?.fullName ?? "—"} />
                <Fld label="Протокол" v={vkr.defense.protocolNumber ?? "—"} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Записи о защите ещё нет.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Fld({ label, v }: { label: string; v: React.ReactNode }) {
  return <div><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="font-medium">{v}</dd></div>;
}

async function TeacherFlow({ teacherId }: { teacherId: string }) {
  const [plan, chairs] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.gekChair.findMany({ where: { isActive: true }, orderBy: [{ year: "desc" }, { fullName: "asc" }] }),
  ]);

  const defPlan = plan.filter((p) => (p.kind === "VKR" || p.kind === "DEFENSE_CHAIR") && p.studentId);
  const studentIds = Array.from(new Set(defPlan.map((p) => p.studentId!)));
  const [students, vkrs] = await Promise.all([
    studentIds.length > 0
      ? prisma.student.findMany({ where: { id: { in: studentIds } }, include: { user: true, group: true } })
      : Promise.resolve([]),
    studentIds.length > 0
      ? prisma.vKR.findMany({ where: { studentId: { in: studentIds } }, include: { defense: { include: { chair: true } } } })
      : Promise.resolve([]),
  ]);
  const vkrByStudent = new Map<string, (typeof vkrs)[number]>();
  for (const v of vkrs) vkrByStudent.set(v.studentId, v);

  const rows: DefenseRow[] = students.map((s) => {
    const v = vkrByStudent.get(s.id) ?? null;
    const planEntry = defPlan.find((p) => p.studentId === s.id);
    return {
      studentId: s.id,
      studentName: s.user.fullName,
      groupName: s.group.name,
      groupSpeciality: s.group.speciality ?? "",
      course: planEntry?.semester?.course ?? s.currentCourse,
      vkrTopic: v?.topic ?? null,
      admission: v?.defense?.admission ?? null,
      admissionDate: v?.defense?.admissionDate ?? null,
      date: v?.defense?.date ?? null,
      grade: v?.defense?.grade ?? null,
      chairName: v?.defense?.chair?.fullName ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Защита ВКР</h1>
      </div>
      <TeacherDefenseView
        rows={rows}
        chairs={chairs.map((c) => ({ id: c.id, fullName: c.fullName }))}
      />
    </div>
  );
}
