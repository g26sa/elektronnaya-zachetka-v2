"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentProfileSchema, type StudentProfileInput } from "@/schemas/student";
import { updateStudentProfile } from "./actions";

type Opt = { id: string; label: string };

export function StudentProfileForm({
  studentId,
  groups,
  initial,
}: {
  studentId: string;
  groups: Opt[];
  initial: StudentProfileInput;
}) {
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<StudentProfileInput>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: initial,
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await updateStudentProfile(studentId, values);
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка сохранения");
      }
    });
  });

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Учётная запись</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="ФИО" err={errors.fullName?.message}><Input {...register("fullName")} /></F>
          <F label="Email" err={errors.email?.message}><Input type="email" {...register("email")} /></F>
          <F label="Новый пароль (если меняем)" err={errors.newPassword?.message}><Input type="text" placeholder="оставьте пустым, чтобы не менять" {...register("newPassword")} /></F>
          <div className="flex items-center gap-2 pt-6">
            <input id="active" type="checkbox" {...register("isActive")} defaultChecked={initial.isActive ?? true} />
            <Label htmlFor="active">Активен</Label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Студенческие данные</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <F label="№ зачётной книжки" err={errors.recordBookNumber?.message}><Input {...register("recordBookNumber")} /></F>
          <Sel label="Группа" {...register("groupId")} options={groups} err={errors.groupId?.message} />
          <F label="Дата рождения" err={errors.birthDate?.message}><Input type="date" {...register("birthDate")} /></F>
          <F label="Дата зачисления" err={errors.enrollmentDate?.message}><Input type="date" {...register("enrollmentDate")} /></F>
          <F label="Приказ о зачислении" err={errors.enrollmentOrder?.message} className="sm:col-span-2"><Input {...register("enrollmentOrder")} /></F>
          <F label="Текущий курс" err={errors.currentCourse?.message}><Input type="number" min={1} max={6} {...register("currentCourse")} /></F>
          <F label="Дата отчисления (если есть)" err={errors.expulsionDate?.message}><Input type="date" {...register("expulsionDate")} /></F>
          <F label="Приказ об отчислении (если есть)" err={errors.expulsionOrder?.message} className="sm:col-span-2"><Input {...register("expulsionOrder")} /></F>
        </div>
      </section>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {savedAt && <p className="text-sm text-success">Сохранено в {savedAt}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
    </form>
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
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
