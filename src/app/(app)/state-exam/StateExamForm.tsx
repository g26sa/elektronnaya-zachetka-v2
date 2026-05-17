"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { stateExamSchema, type StateExamInput } from "@/schemas/vkr";
import { createStateExam, updateStateExam } from "./actions";

type Opt = { id: string; label: string };

export function StateExamForm({
  trigger, id, initial, students, chairs,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<StateExamInput>;
  students: Opt[]; chairs: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<StateExamInput>({
    resolver: zodResolver(stateExamSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      name: initial?.name ?? "",
      admission: (initial?.admission as StateExamInput["admission"]) ?? "ADMITTED",
      admissionDate: initial?.admissionDate ?? "",
      date: initial?.date ?? "",
      grade: initial?.grade ?? "",
      chairId: initial?.chairId ?? "",
      protocolNumber: initial?.protocolNumber ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try { if (id) await updateStateExam(id, values); else await createStateExam(values); setOpen(false); }
      catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{id ? "Редактировать" : "Новый гос. экзамен"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Sel label="Студент" {...register("studentId")} options={students} err={errors.studentId?.message} />
          <F label="Название" err={errors.name?.message}><Input {...register("name")} /></F>
          <Sel label="Допуск" {...register("admission")} options={[{id:"ADMITTED",label:"Допущен"},{id:"NOT_ADMITTED",label:"Не допущен"}]} />
          <F label="Дата допуска"><Input type="date" {...register("admissionDate")} /></F>
          <F label="Дата экзамена"><Input type="date" {...register("date")} /></F>
          <F label="Оценка"><Input {...register("grade")} /></F>
          <Sel label="Председатель ГЭК" {...register("chairId")} options={chairs} />
          <F label="№ протокола"><Input {...register("protocolNumber")} /></F>
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
