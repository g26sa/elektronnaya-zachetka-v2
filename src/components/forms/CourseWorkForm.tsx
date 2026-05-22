"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { courseWorkSchema, type CourseWorkInput } from "@/schemas/coursework";
import { createCourseWork, updateCourseWork } from "@/app/(app)/coursework/actions";
import { GradeSelect } from "./GradeSelect";

type Opt = { id: string; label: string };

export function CourseWorkForm({
  trigger,
  initial,
  id,
  students,
  semesters,
  disciplines,
  teachers,
  lockTeacher,
}: {
  trigger: React.ReactNode;
  initial?: Partial<CourseWorkInput>;
  id?: string;
  students: Opt[];
  semesters: Opt[];
  disciplines: Opt[];
  teachers: Opt[];
  lockTeacher?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CourseWorkInput>({
    resolver: zodResolver(courseWorkSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      semesterId: initial?.semesterId ?? "",
      disciplineId: initial?.disciplineId ?? "",
      topic: initial?.topic ?? "",
      grade: initial?.grade ?? "",
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      teacherId: initial?.teacherId ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updateCourseWork(id, values);
        else await createCourseWork(values);
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
        <DialogHeader><DialogTitle>{id ? "Редактировать курсовую" : "Новая курсовая работа"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Sel label="Студент" {...register("studentId")} options={students} err={errors.studentId?.message} />
          <Sel label="Семестр" {...register("semesterId")} options={semesters} err={errors.semesterId?.message} />
          <Sel label="Дисциплина" {...register("disciplineId")} options={disciplines} err={errors.disciplineId?.message} />
          {lockTeacher ? (
            <input type="hidden" {...register("teacherId")} />
          ) : (
            <Sel label="Преподаватель" {...register("teacherId")} options={teachers} err={errors.teacherId?.message} />
          )}
          <F label="Тема" err={errors.topic?.message} className="sm:col-span-2"><Input {...register("topic")} /></F>
          <GradeSelect {...register("grade")} err={errors.grade?.message} includePass={false} />
          <F label="Дата" err={errors.date?.message}><Input type="date" {...register("date")} /></F>
          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "..." : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, err, children, className }: { label: string; err?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>{children}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
function Sel({ label, options, err, ...rest }: { label: string; options: Opt[]; err?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select {...rest} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
        <option value="">— не выбрано —</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
