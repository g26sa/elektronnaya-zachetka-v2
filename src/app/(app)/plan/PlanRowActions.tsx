"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlanItemForm } from "./PlanItemForm";
import { deletePlanItem } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

type Opt = { id: string; label: string };

export function PlanRowActions(props: {
  id: string;
  initial: Parameters<typeof PlanItemForm>[0]["initial"];
  teachers: Opt[];
  semesters: Opt[];
  disciplines: Opt[];
  groups: Opt[];
  students: Opt[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <PlanItemForm
        id={props.id}
        initial={props.initial}
        teachers={props.teachers}
        semesters={props.semesters}
        disciplines={props.disciplines}
        groups={props.groups}
        students={props.students}
        trigger={<Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        title="Удалить"
        onClick={() => {
          if (!confirm("Удалить эту запись плана?")) return;
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
