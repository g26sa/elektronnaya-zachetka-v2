"use client";

import { Button } from "@/components/ui/button";
import { AssessmentForm, type RefOption } from "@/components/forms/AssessmentForm";
import { DeleteButton } from "@/components/forms/DeleteButton";
import { deleteAssessment } from "./actions";
import { Pencil } from "lucide-react";

export function AssessmentRowActions({
  id,
  initial,
  students,
  semesters,
  disciplines,
  teachers,
  canEdit,
  canDelete,
}: {
  id: string;
  initial: Parameters<typeof AssessmentForm>[0]["initial"];
  students: RefOption[];
  semesters: RefOption[];
  disciplines: RefOption[];
  teachers: RefOption[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      {canEdit && (
        <AssessmentForm
          id={id}
          initial={initial}
          students={students}
          semesters={semesters}
          disciplines={disciplines}
          teachers={teachers}
          trigger={
            <Button variant="ghost" size="icon" title="Редактировать">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
      )}
      {canDelete && <DeleteButton onConfirm={() => deleteAssessment(id)} />}
    </div>
  );
}
