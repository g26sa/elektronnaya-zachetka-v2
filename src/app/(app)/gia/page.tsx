import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VkrForm } from "./VkrForm";
import { TeacherVkrView, type VkrRow } from "./TeacherVkrView";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { formatDate } from "@/lib/utils";
import { Pencil, Printer } from "lucide-react";

export default async function GiaPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  let studentId: string | null = params.studentId ?? null;
  if (session.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = me?.id ?? null;
  }

  // ─── ПРЕПОДАВАТЕЛЬ — новый flow по студентам из плана VKR ──────────────
  if (session.role === "TEACHER") return <TeacherFlow teacherId={session.userId} />;
  const [students, teachers, vkr] = await Promise.all([
    prisma.student.findMany({ include: { user: true, group: true }, orderBy: { user: { fullName: "asc" } } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "HEAD"] } }, orderBy: { fullName: "asc" } }),
    studentId
      ? prisma.vKR.findUnique({
          where: { studentId },
          include: { supervisor: true, defense: { include: { chair: true } } },
        })
      : null,
  ]);
  const oS = students.map((s) => ({ id: s.id, label: `${s.user.fullName} (${s.group.name})` }));
  const oT = teachers.map((t) => ({ id: t.id, label: t.fullName }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-semibold">Выпускная квалификационная работа</h1></div>
        {studentId && (
          <Button asChild variant="outline">
            <Link href={`/print/gia/${studentId}`} target="_blank"><Printer className="h-4 w-4 mr-2" />Печать</Link>
          </Button>
        )}
      </div>

      {session.role !== "STUDENT" && (
        <Card><CardContent className="p-4">
          <form className="flex gap-2 items-end" action="/gia" method="get">
            <select name="studentId" defaultValue={studentId ?? ""} className="flex h-9 max-w-md rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— выберите студента —</option>
              {oS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Показать</Button>
          </form>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center justify-between">
          <span>Тема ВКР</span>
          {studentId && can(session, "vkr:edit") && (
            <VkrForm
              students={oS}
              teachers={oT}
              initial={vkr ? {
                studentId,
                topic: vkr.topic,
                type: vkr.type ?? "",
                approvedOrder: vkr.approvedOrder ?? "",
                approvedDate: vkr.approvedDate ? vkr.approvedDate.toISOString().slice(0,10) : "",
                supervisorId: vkr.supervisorId,
              } : { studentId }}
              trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-2" />{vkr ? "Изменить" : "Назначить"}</Button>}
            />
          )}
        </CardTitle></CardHeader>
        <CardContent>
          {vkr ? (
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Fld label="Тема" v={vkr.topic} />
              <Fld label="Вид" v={vkr.type ?? "—"} />
              <Fld label="Научный руководитель" v={vkr.supervisor.fullName} />
              <Fld label="Приказ об утверждении" v={vkr.approvedOrder ?? "—"} />
              <Fld label="Дата приказа" v={formatDate(vkr.approvedDate)} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Тема ВКР ещё не назначена.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fld({ label, v }: { label: string; v: string }) {
  return <div><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="font-medium">{v}</dd></div>;
}

// ──────────────────────────────────────────────────────────────────────────
// ПРЕПОДАВАТЕЛЬ: ВКР по студентам из плана VKR
// ──────────────────────────────────────────────────────────────────────────
async function TeacherFlow({ teacherId }: { teacherId: string }) {
  const [plan, vkrTypes] = await Promise.all([
    getTeacherPlan(teacherId),
    prisma.vkrType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const vkrPlan = plan.filter((p) => p.kind === "VKR" && p.studentId);
  const studentIds = vkrPlan.map((p) => p.studentId!);
  const [students, vkrs] = await Promise.all([
    studentIds.length > 0
      ? prisma.student.findMany({
          where: { id: { in: studentIds } },
          include: { user: true, group: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? prisma.vKR.findMany({ where: { studentId: { in: studentIds } } })
      : Promise.resolve([]),
  ]);
  const vkrByStudent = new Map<string, (typeof vkrs)[number]>();
  for (const v of vkrs) vkrByStudent.set(v.studentId, v);

  const rows: VkrRow[] = students.map((s) => {
    const v = vkrByStudent.get(s.id) ?? null;
    const planEntry = vkrPlan.find((p) => p.studentId === s.id);
    return {
      id: v?.id ?? null,
      studentId: s.id,
      studentName: s.user.fullName,
      groupId: s.groupId,
      groupName: s.group.name,
      groupSpeciality: s.group.speciality ?? "",
      course: planEntry?.semester?.course ?? s.currentCourse,
      topic: v?.topic ?? null,
      type: v?.type ?? null,
      approvedOrder: v?.approvedOrder ?? null,
      approvedDate: v?.approvedDate ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Выпускная квалификационная работа</h1>
      </div>
      <TeacherVkrView rows={rows} vkrTypes={vkrTypes.map((t) => ({ id: t.id, name: t.name }))} />
    </div>
  );
}
