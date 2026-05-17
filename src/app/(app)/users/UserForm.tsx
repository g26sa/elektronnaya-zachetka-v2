"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { userSchema, type UserInput } from "@/schemas/user";
import { createUser, updateUser } from "./actions";

export function UserForm({
  trigger, id, initial,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<UserInput>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: initial?.email ?? "",
      fullName: initial?.fullName ?? "",
      role: (initial?.role as UserInput["role"]) ?? "TEACHER",
      position: initial?.position ?? "",
      isActive: initial?.isActive ?? true,
      password: "",
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try { if (id) await updateUser(id, values); else await createUser(values); setOpen(false); }
      catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{id ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <F label="Email" err={errors.email?.message}><Input type="email" {...register("email")} /></F>
          <F label="ФИО" err={errors.fullName?.message}><Input {...register("fullName")} /></F>
          <Sel label="Роль" {...register("role")} options={[{id:"STUDENT",label:"Студент"},{id:"TEACHER",label:"Преподаватель"},{id:"HEAD",label:"Заведующий отделением"}]} err={errors.role?.message} />
          <F label="Должность"><Input {...register("position")} /></F>
          <F label={id ? "Новый пароль (если меняем)" : "Пароль (по умолчанию demo1234)"}><Input type="text" {...register("password")} /></F>
          <div className="flex items-center gap-2 pt-6">
            <input id="active" type="checkbox" {...register("isActive")} defaultChecked={initial?.isActive ?? true} />
            <Label htmlFor="active">Активен</Label>
          </div>
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

function F({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{err && <p className="text-xs text-destructive">{err}</p>}</div>;
}
function Sel({ label, options, err, ...rest }: { label: string; options: { id: string; label: string }[]; err?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select {...rest} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
