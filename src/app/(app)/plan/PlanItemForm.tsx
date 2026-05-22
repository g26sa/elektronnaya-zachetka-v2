"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { planItemSchema, type PlanItemInput } from "@/schemas/plan";
import { createPlanItem, updatePlanItem } from "./actions";
import { TeachingKindValues, teachingKindLabel, type TeachingKind } from "@/types/enums";

type Opt = { id: string; label: string };

export function PlanItemForm({
  trigger,
  id,
  initial,
  teachers,
  semesters,
  disciplines,
  groups,
  students,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<PlanItemInput>;
  teachers: Opt[];
  semesters: Opt[];
  disciplines: Opt[];
  groups: Opt[];
  students: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const {
    register, handleSubmit, control, setValue, formState: { errors },
  } = useForm<PlanItemInput>({
    resolver: zodResolver(planItemSchema),
    defaultValues: {
      teacherId: initial?.teacherId ?? "",
      kind: (initial?.kind as TeachingKind) ?? "ASSESSMENT",
      semesterId: initial?.semesterId ?? "",
      disciplineId: initial?.disciplineId ?? "",
      groupId: initial?.groupId ?? "",
      studentId: initial?.studentId ?? "",
      hours: initial?.hours ?? undefined,
      notes: initial?.notes ?? "",
    },
  });

  const kind = useWatch({ control, name: "kind" });
  const isStudentBased = kind === "VKR" || kind === "DEFENSE_CHAIR" || kind === "STATE_EXAM_CHAIR";
  const needsDiscipline = kind === "ASSESSMENT" || kind === "COURSEWORK";
  const needsHours = kind === "ASSESSMENT";
  const needsGroup = !isStudentBased;

  // При смене типа работы — сбрасываем поля, неприменимые к новому типу,
  // чтобы в БД не уходили «фантомные» значения.
  useEffect(() => {
    if (!needsDiscipline) setValue("disciplineId", "");
    if (!needsHours) setValue("hours", undefined as unknown as number);
    if (!needsGroup) setValue("groupId", "");
    if (!isStudentBased) setValue("studentId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updatePlanItem(id, values);
        else await createPlanItem(values);
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
        <DialogHeader>
          <DialogTitle>{id ? "Редактировать назначение" : "Новое назначение"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Sel label="Преподаватель" {...register("teacherId")} options={teachers} err={errors.teacherId?.message} />
          <Sel
            label="Тип работы"
            {...register("kind")}
            options={TeachingKindValues.map((k) => ({ id: k, label: teachingKindLabel(k) }))}
            err={errors.kind?.message}
          />
          <Sel label="Семестр" {...register("semesterId")} options={semesters} />
          {needsDiscipline && (
            <Sel label="Дисциплина" {...register("disciplineId")} options={disciplines} />
          )}
          {needsHours && (
            <F label="Часы по плану"><Input type="number" min={0} {...register("hours")} /></F>
          )}
          {needsGroup && (
            <Sel label="Группа" {...register("groupId")} options={groups} />
          )}
          {isStudentBased && (
            <Sel label="Студент" {...register("studentId")} options={students} className="sm:col-span-2" />
          )}
          <F label="Примечание" className="sm:col-span-2">
            <Input placeholder="(необязательно)" {...register("notes")} />
          </F>

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

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}</div>;
}
function Sel({
  label, options, err, className, ...rest
}: { label: string; options: Opt[]; err?: string; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      <select {...rest} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
        <option value="">— не выбрано —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
