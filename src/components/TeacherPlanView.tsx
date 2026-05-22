import Link from "next/link";
import { getTeacherPlan } from "@/lib/teacherPlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { teachingKindLabel } from "@/types/enums";
import {
  ClipboardList,
  ChevronRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  ScrollText,
  FileBadge,
} from "lucide-react";

const KIND_TARGETS: Record<string, { href: (planId: string, studentId?: string) => string; icon: React.ElementType; label: string }> = {
  ASSESSMENT:       { href: (pid)        => `/attestations/${pid}`,                              icon: ClipboardList, label: "Открыть" },
  COURSEWORK:       { href: (_pid, sid)  => `/coursework${sid ? `?studentId=${sid}` : ""}`,       icon: BookOpen,      label: "К курсовым" },
  PRACTICE:         { href: (_pid, sid)  => `/practice${sid ? `?studentId=${sid}` : ""}`,         icon: Briefcase,     label: "К практике" },
  VKR:              { href: (_pid, sid)  => `/gia${sid ? `?studentId=${sid}` : ""}`,              icon: GraduationCap, label: "К ВКР" },
  DEFENSE_CHAIR:    { href: (_pid, sid)  => `/defense${sid ? `?studentId=${sid}` : ""}`,          icon: ScrollText,    label: "К защите" },
  STATE_EXAM_CHAIR: { href: (_pid, sid)  => `/state-exam${sid ? `?studentId=${sid}` : ""}`,       icon: FileBadge,     label: "К гос. экзамену" },
};

/**
 * Карточный обзор плана преподавателя. Сгруппирован по типу работы.
 * Часы скрываются для ВКР/защиты/гос.экзамена и для практики без указанных часов.
 */
export async function TeacherPlanView({ teacherId }: { teacherId: string }) {
  const plan = await getTeacherPlan(teacherId);

  const byKind = new Map<string, typeof plan>();
  for (const item of plan) {
    const arr = byKind.get(item.kind) ?? [];
    arr.push(item);
    byKind.set(item.kind, arr);
  }

  if (plan.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground space-y-2">
        <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
        <p>Заведующий отделением ещё не сформировал ваш план.</p>
        <p className="text-xs">После назначений здесь появятся ваши дисциплины, группы и студенты.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(byKind.entries()).map(([kind, items]) => {
        const target = KIND_TARGETS[kind];
        const Icon = target?.icon ?? ClipboardList;
        const hideHoursForKind = kind === "VKR" || kind === "DEFENSE_CHAIR" || kind === "STATE_EXAM_CHAIR";
        return (
          <Card key={kind}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {teachingKindLabel(kind)}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((it) => {
                // Семестр — просто номер; группа сама несёт год набора
                const semLabel = it.semester ? `${it.semester.number} сем.` : "—";
                const sidForLink = it.studentId ?? undefined;
                const showHours =
                  !hideHoursForKind && it.hours != null && it.hours > 0;
                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {it.discipline?.name ?? (it.student ? it.student.user.fullName : "Без дисциплины")}
                      </div>
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>{semLabel}</span>
                        {it.group && <span>· группа <b>{it.group.name}</b></span>}
                        {it.student && <span>· {it.student.user.fullName}</span>}
                        {showHours && <span>· {it.hours} ч.</span>}
                        {it.notes && <span>· {it.notes}</span>}
                      </div>
                    </div>
                    {target && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={target.href(it.id, sidForLink)}>
                          {target.label}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
