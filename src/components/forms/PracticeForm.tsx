"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { practiceSchema, type PracticeInput } from "@/schemas/practice";
import { createPractice, updatePractice } from "@/app/(app)/practice/actions";
import { GradeSelect } from "./GradeSelect";

type Opt = { id: string; label: string };

export function PracticeForm({
  trigger, initial, id, students, semesters, teachers, lockTeacher,
}: {
  trigger: React.ReactNode;
  initial?: Partial<PracticeInput>;
  id?: string;
  students: Opt[]; semesters: Opt[]; teachers: Opt[];
  lockTeacher?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<PracticeInput>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      semesterId: initial?.semesterId ?? "",
      course: initial?.course ?? 1,
      kind: (initial?.kind as PracticeInput["kind"]) ?? "EDUCATIONAL",
      place: initial?.place ?? "",
      hours: initial?.hours ?? undefined,
      creditUnits: initial?.creditUnits ?? undefined,
      startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: initial?.endDate ?? new Date().toISOString().slice(0, 10),
      grade: initial?.grade ?? "",
      gradeDate: initial?.gradeDate ?? new Date().toISOString().slice(0, 10),
      instSupervisorId: initial?.instSupervisorId ?? "",
      orgSupervisorName: initial?.orgSupervisorName ?? "",
      orgSupervisorPosition: initial?.orgSupervisorPosition ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updatePractice(id, values); else await createPractice(values);
        setOpen(false);
      } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{id ? "Редактировать практику" : "Новая практика"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Sel label="Студент" {...register("studentId")} options={students} err={errors.studentId?.message} />
          <Sel label="Семестр" {...register("semesterId")} options={semesters} err={errors.semesterId?.message} />
          {lockTeacher ? (
            <input type="hidden" {...register("course")} />
          ) : (
            <F label="Курс" err={errors.course?.message}><Input type="number" min={1} {...register("course")} /></F>
          )}
          <Sel label="Вид"
            {...register("kind")}
            options={[{id:"EDUCATIONAL",label:"Учебная"},{id:"PRODUCTION",label:"Производственная"},{id:"PREDIPLOMA",label:"Преддипломная"}]}
            err={errors.kind?.message}/>
          <F label="Место" err={errors.place?.message} className="sm:col-span-2"><Input {...register("place")} /></F>
          {lockTeacher ? (
            <>
              <input type="hidden" {...register("hours")} />
              <input type="hidden" {...register("creditUnits")} />
            </>
          ) : (
            <>
              <F label="Часы" err={errors.hours?.message}><Input type="number" min={0} {...register("hours")} /></F>
              <F label="З.е." err={errors.creditUnits?.message}><Input type="number" min={0} step={0.5} {...register("creditUnits")} /></F>
            </>
          )}
          <F label="Начало" err={errors.startDate?.message}><Input type="date" {...register("startDate")} /></F>
          <F label="Окончание" err={errors.endDate?.message}><Input type="date" {...register("endDate")} /></F>
          <GradeSelect {...register("grade")} err={errors.grade?.message} includePass={false} />
          <F label="Дата оценки" err={errors.gradeDate?.message}><Input type="date" {...register("gradeDate")} /></F>
          {lockTeacher ? (
            <input type="hidden" {...register("instSupervisorId")} />
          ) : (
            <Sel label="Руководитель от учреждения" {...register("instSupervisorId")} options={teachers} err={errors.instSupervisorId?.message} />
          )}
          <F label="Руководитель от организации (ФИО)"><Input {...register("orgSupervisorName")} /></F>
          {!lockTeacher && <F label="Должность от организации"><Input {...register("orgSupervisorPosition")} /></F>}
          {lockTeacher && <input type="hidden" {...register("orgSupervisorPosition")} />}
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
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}{err && <p className="text-xs text-destructive">{err}</p>}</div>;
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
