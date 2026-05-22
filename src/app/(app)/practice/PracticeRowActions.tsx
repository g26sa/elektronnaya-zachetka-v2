"use client";
import { Button } from "@/components/ui/button";
import { PracticeForm } from "@/components/forms/PracticeForm";
import { DeleteButton } from "@/components/forms/DeleteButton";
import { deletePractice } from "./actions";
import { Pencil } from "lucide-react";

type Opt = { id: string; label: string };
export function PracticeRowActions(props: {
  id: string;
  initial: Parameters<typeof PracticeForm>[0]["initial"];
  students: Opt[]; semesters: Opt[]; teachers: Opt[];
  canEdit: boolean; canDelete: boolean;
  lockTeacher?: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      {props.canEdit && (
        <PracticeForm id={props.id} initial={props.initial} students={props.students} semesters={props.semesters} teachers={props.teachers}
          lockTeacher={props.lockTeacher}
          trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      )}
      {props.canDelete && <DeleteButton onConfirm={() => deletePractice(props.id)} />}
    </div>
  );
}
