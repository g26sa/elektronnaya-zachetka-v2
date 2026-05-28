"use client";
import { Button } from "@/components/ui/button";
import { StateExamForm } from "./StateExamForm";
import { DeleteButton } from "@/components/forms/DeleteButton";
import { deleteStateExam } from "./actions";
import { Pencil } from "lucide-react";

type Opt = { id: string; label: string };
type StudentOpt = { id: string; label: string; groupName: string; speciality: string };
export function StateExamRowActions(props: {
  id: string;
  initial: Parameters<typeof StateExamForm>[0]["initial"];
  students: StudentOpt[]; chairs: Opt[];
  canEdit: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      {props.canEdit && (
        <StateExamForm id={props.id} initial={props.initial} students={props.students} chairs={props.chairs}
          trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      )}
      {props.canEdit && <DeleteButton onConfirm={() => deleteStateExam(props.id)} />}
    </div>
  );
}
