"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { groupSchema, type GroupInput } from "@/schemas/group";
import { createGroup, updateGroup } from "./actions";

export function GroupForm({
  trigger, id, initial, specialities,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<GroupInput>;
  /** Подсказки — список уже существующих специальностей. */
  specialities?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initial?.name ?? "",
      speciality: initial?.speciality ?? "",
      startYear: initial?.startYear ?? new Date().getFullYear(),
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updateGroup(id, values);
        else await createGroup(values);
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
        <DialogHeader><DialogTitle>{id ? "Редактировать группу" : "Новая группа"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <F label="Название" err={errors.name?.message}>
            <Input placeholder="например, ИС-21" {...register("name")} />
          </F>
          <F label="Год набора" err={errors.startYear?.message}>
            <Input type="number" min={1990} max={2100} {...register("startYear")} />
          </F>
          <F label="Специальность / направление" err={errors.speciality?.message} className="sm:col-span-2">
            <Input
              list="speciality-suggestions"
              placeholder="09.02.07 Информационные системы и программирование"
              {...register("speciality")}
            />
            {specialities && specialities.length > 0 && (
              <datalist id="speciality-suggestions">
                {specialities.map((s) => <option key={s} value={s} />)}
              </datalist>
            )}
          </F>

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

function F({ label, err, children, className }: { label: string; err?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
