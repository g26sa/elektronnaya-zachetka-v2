"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "./actions";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [pending, startTransition] = useTransition();
  const [ask, ConfirmNode] = useConfirm();

  return (
    <>
      {ConfirmNode}
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
        disabled={pending}
        onClick={async () => {
          if (!(await ask(
            `Удалить студента «${studentName}» вместе со всеми его оценками, курсовыми и ВКР?\n\nЭто действие необратимо.`,
            "Удаление студента"
          ))) return;
          startTransition(async () => { await deleteStudent(studentId); });
        }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Удалить студента
      </Button>
    </>
  );
}
