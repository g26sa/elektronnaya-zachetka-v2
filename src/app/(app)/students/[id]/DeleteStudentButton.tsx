"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "./actions";
import { Trash2 } from "lucide-react";

export function DeleteStudentButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/40 hover:bg-destructive/10"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Удалить студента «${studentName}» вместе со всеми его оценками, курсовыми и ВКР?\n\nЭто действие необратимо.`)) return;
        startTransition(async () => { await deleteStudent(studentId); });
      }}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Удалить студента
    </Button>
  );
}
