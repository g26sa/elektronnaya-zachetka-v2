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
import { saveCourseWorkQuick } from "../actions-quick";

const schema = z.object({
  id: z.string().optional(),
  semesterId: z.string().min(1),
  disciplineId: z.string().min(1),
  groupId: z.string().min(1),
  studentId: z.string().min(1),
  topic: z.string().min(1, "Введите тему"),
  grade: z.string().optional(),
  date: z.string().optional(),
  assignedAt: z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

export function CourseWorkStudentForm({
  trigger,
  studentName,
  studentId,
  planContext,
  initial,
}: {
  trigger: React.ReactNode;
  studentName: string;
  studentId: string;
  planContext: { semesterId: string; disciplineId: string; groupId: string };
  initial?: {
    id?: string;
    topic?: string;
    grade?: string;
    date?: string;
    assignedAt?: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const str = { setValueAs: (v: unknown) => (v == null ? "" : String(v)) };

  const defaults: FormInput = {
    id: initial?.id ?? "",
    ...planContext,
    studentId,
    topic: initial?.topic ?? "",
    grade: initial?.grade ?? "",
    date: initial?.date ?? "",
    assignedAt: initial?.assignedAt ?? new Date().toISOString().slice(0, 10),
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(defaults);
  };

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveCourseWorkQuick(values);
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
            {initial?.id ? "Редактировать курсовую" : "Выдать тему / выставить оценку"} · {studentName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("id", str)} />
          <input type="hidden" {...register("semesterId", str)} />
          <input type="hidden" {...register("disciplineId", str)} />
          <input type="hidden" {...register("groupId", str)} />
          <input type="hidden" {...register("studentId", str)} />

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Тема курсовой работы</Label>
            <Input {...register("topic", str)} placeholder="Введите тему…" />
            {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Дата выдачи темы</Label>
            <Input type="date" {...register("assignedAt", str)} />
          </div>

          <GradeSelect
            label="Оценка (необязательно)"
            {...register("grade", str)}
            err={errors.grade?.message}
            includePass={false}
          />
          <div className="space-y-1.5">
            <Label>Дата выставления оценки</Label>
            <Input type="date" {...register("date", str)} />
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
