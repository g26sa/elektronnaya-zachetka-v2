"use client";
import { Button } from "@/components/ui/button";
import { CourseWorkForm } from "@/components/forms/CourseWorkForm";
import { DeleteButton } from "@/components/forms/DeleteButton";
import { deleteCourseWork } from "./actions";
import { Pencil } from "lucide-react";

type Opt = { id: string; label: string };
export function CourseWorkRowActions(props: {
  id: string;
  initial: Parameters<typeof CourseWorkForm>[0]["initial"];
  students: Opt[]; semesters: Opt[]; disciplines: Opt[]; teachers: Opt[];
  canEdit: boolean; canDelete: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      {props.canEdit && (
        <CourseWorkForm
          id={props.id} initial={props.initial}
          students={props.students} semesters={props.semesters} disciplines={props.disciplines} teachers={props.teachers}
          trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
        />
      )}
      {props.canDelete && <DeleteButton onConfirm={() => deleteCourseWork(props.id)} />}
    </div>
  );
}
