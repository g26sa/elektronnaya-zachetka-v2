import Link from "next/link";
import {
  getTeacherPlanForDisplay,
  planItemHref,
} from "@/lib/teacher-plan-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { teachingKindLabel } from "@/types/enums";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  ChevronRight,
  BookOpen,
  Briefcase,
  GraduationCap,
  ScrollText,
  FileBadge,
} from "lucide-react";

const KIND_META: Record<string, { icon: React.ElementType; label: string }> = {
  ASSESSMENT: { icon: ClipboardList, label: "Открыть" },
  COURSEWORK: { icon: BookOpen, label: "К курсовым" },
  PRACTICE: { icon: Briefcase, label: "К практике" },
  VKR: { icon: GraduationCap, label: "К ВКР" },
  DEFENSE_CHAIR: { icon: ScrollText, label: "К защите" },
  STATE_EXAM_CHAIR: { icon: FileBadge, label: "К гос. экзамену" },
};

/**
 * Карточный обзор плана преподавателя. Сгруппирован по типу работы.
 */
export async function TeacherPlanView({ teacherId }: { teacherId: string }) {
  const plan = await getTeacherPlanForDisplay(teacherId, { onlyWithActualWork: true });

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
        <p>Нет активных направлений для отображения.</p>
        <p className="text-xs">
          Здесь показываются дисциплины, ВКР и практики, по которым уже заведены данные в системе.
        </p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(byKind.entries()).map(([kind, items]) => {
        const meta = KIND_META[kind];
        const Icon = meta?.icon ?? ClipboardList;
        const actionLabel = meta?.label ?? "Открыть";
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
                const href = planItemHref(it);
                const showHours =
                  !hideHoursForKind && it.hours != null && it.hours > 0;
                return (
                  <Link
                    key={it.id}
                    href={href}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{it.displayTitle}</div>
                      {it.displaySubtitle && (
                        <div className="text-xs text-muted-foreground truncate" title={it.displaySubtitle}>
                          {it.displaySubtitle}
                          {showHours && !it.displaySubtitle.includes(" ч.") ? ` · ${it.hours} ч.` : ""}
                        </div>
                      )}
                      {!it.displaySubtitle && showHours && (
                        <div className="text-xs text-muted-foreground">{it.hours} ч.</div>
                      )}
                    </div>
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "shrink-0 pointer-events-none"
                      )}
                    >
                      {actionLabel}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
