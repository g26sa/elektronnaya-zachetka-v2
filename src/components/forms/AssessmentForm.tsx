"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assessmentSchema, type AssessmentInput } from "@/schemas/assessment";
import { createAssessment, updateAssessment } from "@/app/(app)/attestations/actions";
import { GradeSelect } from "./GradeSelect";

export type RefOption = { id: string; label: string };

export function AssessmentForm({
  trigger,
  initial,
  id,
  students,
  semesters,
  disciplines,
  teachers,
  lockTeacher,
  onDone,
}: {
  trigger: React.ReactNode;
  initial?: Partial<AssessmentInput>;
  id?: string;
  students: RefOption[];
  semesters: RefOption[];
  disciplines: RefOption[];
  teachers: RefOption[];
  /** Если true — поле «преподаватель» скрыто, значение фиксировано (для роли TEACHER). */
  lockTeacher?: boolean;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      semesterId: initial?.semesterId ?? "",
      disciplineId: initial?.disciplineId ?? "",
      type: (initial?.type as AssessmentInput["type"]) ?? "EXAM",
      grade: initial?.grade ?? "",
      hours: initial?.hours ?? undefined,
      creditUnits: initial?.creditUnits ?? undefined,
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      teacherId: initial?.teacherId ?? "",
      protocolNumber: initial?.protocolNumber ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updateAssessment(id, values);
        else await createAssessment(values);
        setOpen(false);
        reset(values);
        onDone?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка сохранения");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{id ? "Редактировать оценку" : "Новая оценка"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <NativeSelect label="Студент" error={errors.studentId?.message} {...register("studentId")} options={students} />
          <NativeSelect label="Семестр" error={errors.semesterId?.message} {...register("semesterId")} options={semesters} />
          <NativeSelect label="Дисциплина" error={errors.disciplineId?.message} {...register("disciplineId")} options={disciplines} />
          <NativeSelect
            label="Тип"
            error={errors.type?.message}
            {...register("type")}
            options={[
              { id: "EXAM", label: "Экзамен" },
              { id: "CREDIT", label: "Зачёт" },
              { id: "GRADED_CREDIT", label: "Дифференцированный зачёт" },
            ]}
          />
          <GradeSelect {...register("grade")} err={errors.grade?.message} />
          <Field label="Часы" error={errors.hours?.message}>
            <Input type="number" min={0} {...register("hours")} readOnly={lockTeacher} />
          </Field>
          <Field label="Дата" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </Field>
          {lockTeacher ? (
            <input type="hidden" {...register("teacherId")} />
          ) : (
            <NativeSelect label="Преподаватель" error={errors.teacherId?.message} {...register("teacherId")} options={teachers} />
          )}
          <input type="hidden" {...register("creditUnits")} />
          <input type="hidden" {...register("protocolNumber")} />

          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}

          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const NativeSelect = ({
  label,
  options,
  error,
  ...rest
}: {
  label: string;
  options: RefOption[];
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <select
      {...rest}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">— не выбрано —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);
