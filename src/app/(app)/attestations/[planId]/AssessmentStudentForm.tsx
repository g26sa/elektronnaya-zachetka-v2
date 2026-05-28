"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GradeSelect } from "@/components/forms/GradeSelect";
import { AssessmentTypeValues } from "@/types/enums";
import { saveAssessmentFromPlan } from "./actions";

const schema = z.object({
  planId: z.string(),
  studentId: z.string().min(1),
  assessmentId: z.string().optional(),
  type: z.enum(AssessmentTypeValues),
  grade: z.string().min(1, "Выберите оценку"),
  date: z.string().min(1, "Введите дату"),
});
type FormInput = z.infer<typeof schema>;

export function AssessmentStudentForm({
  trigger,
  planId,
  studentId,
  studentName,
  initial,
  controlForm,
}: {
  trigger: React.ReactNode;
  planId: string;
  studentId: string;
  studentName: string;
  initial?: {
    assessmentId?: string;
    type?: FormInput["type"];
    grade?: string;
    date?: string;
  };
  controlForm?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const resolvedType = (
    initial?.type ?? controlForm as FormInput["type"] ?? "EXAM"
  ) as FormInput["type"];

  const formDefaults: FormInput = {
    planId,
    studentId,
    assessmentId: initial?.assessmentId ?? "",
    type: resolvedType,
    grade: initial?.grade ?? "",
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(formDefaults);
  };

  const str = { setValueAs: (v: unknown) => (v == null ? "" : String(v)) };

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveAssessmentFromPlan(values);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.assessmentId ? "Редактировать оценку" : "Выставить оценку"} · {studentName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("planId")} />
          <input type="hidden" {...register("studentId")} />
          <input type="hidden" {...register("assessmentId")} />
          <input type="hidden" {...register("type", str)} />
          <GradeSelect {...register("grade", str)} err={errors.grade?.message} />
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input type="date" {...register("date", str)} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
