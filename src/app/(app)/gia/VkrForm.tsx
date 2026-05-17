"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { vkrSchema, type VkrInput } from "@/schemas/vkr";
import { upsertVkr } from "./actions";

type Opt = { id: string; label: string };

export function VkrForm({
  trigger, initial, students, teachers,
}: {
  trigger: React.ReactNode;
  initial?: Partial<VkrInput>;
  students: Opt[]; teachers: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<VkrInput>({
    resolver: zodResolver(vkrSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      topic: initial?.topic ?? "",
      type: initial?.type ?? "",
      approvedOrder: initial?.approvedOrder ?? "",
      approvedDate: initial?.approvedDate ?? "",
      supervisorId: initial?.supervisorId ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try { await upsertVkr(values); setOpen(false); }
      catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Тема ВКР</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Sel label="Студент" {...register("studentId")} options={students} err={errors.studentId?.message} />
          <Sel label="Научный руководитель" {...register("supervisorId")} options={teachers} err={errors.supervisorId?.message} />
          <F label="Тема" err={errors.topic?.message} className="sm:col-span-2"><Input {...register("topic")} /></F>
          <Sel
            label="Вид"
            {...register("type")}
            options={[
              { id: "Дипломный проект", label: "Дипломный проект" },
              { id: "Дипломная работа", label: "Дипломная работа" },
              { id: "ВКР бакалавра", label: "ВКР бакалавра" },
              { id: "ВКР магистра", label: "ВКР магистра" },
            ]}
          />
          <F label="Приказ"><Input {...register("approvedOrder")} /></F>
          <F label="Дата приказа"><Input type="date" {...register("approvedDate")} /></F>
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
