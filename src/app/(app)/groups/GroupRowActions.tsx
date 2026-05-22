"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { GroupForm } from "./GroupForm";
import { deleteGroup } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

export function GroupRowActions({
  id,
  initial,
  specialities,
  studentCount,
}: {
  id: string;
  initial: Parameters<typeof GroupForm>[0]["initial"];
  specialities: string[];
  studentCount: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <GroupForm
        id={id}
        initial={initial}
        specialities={specialities}
        trigger={<Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>}
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={pending || studentCount > 0}
        title={studentCount > 0 ? `Сначала переведите ${studentCount} студентов в другую группу` : "Удалить"}
        onClick={() => {
          if (!confirm("Удалить эту группу?")) return;
          startTransition(async () => {
            try { await deleteGroup(id); }
            catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
          });
        }}
      >
        <Trash2 className={"h-4 w-4 " + (studentCount > 0 ? "opacity-40" : "text-destructive")} />
      </Button>
    </div>
  );
}
