"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GradeSelect } from "@/components/forms/GradeSelect";
import { AssessmentTypeValues } from "@/types/enums";
import { createAssessmentFromPlan } from "./actions";

type Student = { id: string; label: string };

const schema = z.object({
  planId: z.string(),
  studentId: z.string().min(1, "Выберите студента"),
  type: z.enum(AssessmentTypeValues),
  grade: z.string().min(1, "Выберите оценку"),
  date: z.string().min(1, "Введите дату"),
});
type Input = z.infer<typeof schema>;

export function QuickAddForm({
  trigger, planId, students,
}: {
  trigger: React.ReactNode;
  planId: string;
  students: Student[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      planId,
      studentId: "",
      type: "EXAM",
      grade: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await createAssessmentFromPlan(values);
        reset({ ...values, studentId: "", grade: "" });
        setOpen(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Выставить оценку</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("planId")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Студент</Label>
            <select
              {...register("studentId")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— выберите —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Форма контроля</Label>
            <select
              {...register("type")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="EXAM">Экзамен</option>
              <option value="CREDIT">Зачёт</option>
              <option value="GRADED_CREDIT">Дифференцированный зачёт</option>
            </select>
          </div>
          <GradeSelect {...register("grade")} err={errors.grade?.message} />
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input type="date" {...register("date")} />
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
