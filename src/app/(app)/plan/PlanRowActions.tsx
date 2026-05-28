"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlanItemForm } from "./PlanItemForm";
import { deletePlanItem } from "./actions";
import { Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

import type { SemesterRef } from "@/lib/group-course";

type Opt = { id: string; label: string };
type GroupOpt = { id: string; name: string };
type StudentOpt = { id: string; label: string; groupId: string };

export function PlanRowActions(props: {
  id: string;
  initial: Parameters<typeof PlanItemForm>[0]["initial"];
  teachers: Opt[];
  semesters: SemesterRef[];
  disciplines: Opt[];
  groups: GroupOpt[];
  students: StudentOpt[];
  isHead?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [ask, ConfirmNode] = useConfirm();

  return (
    <div className="flex justify-end gap-1">
      {ConfirmNode}
      <PlanItemForm
        id={props.id}
        initial={props.initial}
        teachers={props.teachers}
        semesters={props.semesters}
        disciplines={props.disciplines}
        groups={props.groups}
        students={props.students}
        isHead={props.isHead}
        trigger={<Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        title="Удалить"
        onClick={async () => {
          if (!(await ask("Удалить эту запись плана?\n\nВместе с планом будут удалены все оценки студентов группы по этой дисциплине."))) return;
          startTransition(async () => {
            try { await deletePlanItem(props.id); }
            catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
