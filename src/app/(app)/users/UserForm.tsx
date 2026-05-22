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
  const [info, setInfo] = useState<string | null>(null);

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
    setInfo(null);
    startTransition(async () => {
      try {
        if (id) {
          const result = await updateUser(id, values);
          // Пароль сменили — оставляем окно открытым, чтобы пользователь
          // увидел, ушло ли письмо. В остальных случаях молча закрываем.
          if (values.password && values.password.length > 0) {
            setInfo(
              result.emailSent
                ? "Новый пароль отправлен на email пользователя."
                : "Пароль обновлён. Письмо не ушло — проверьте SMTP или консоль сервера."
            );
            return;
          }
          setOpen(false);
        } else {
          // Создание нового пользователя — всегда оставляем окно
          // открытым с info, чтобы заведующий увидел статус отправки письма.
          const result = await createUser(values);
          setInfo(
            result.emailSent
              ? `Пользователь создан. Доступ отправлен на ${values.email}.`
              : `Пользователь создан. Письмо не ушло — проверьте SMTP или консоль сервера (email: ${values.email}).`
          );
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setErr(null); setInfo(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{id ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <F label="Email" err={errors.email?.message}><Input type="email" {...register("email")} /></F>
          <F label="ФИО" err={errors.fullName?.message}><Input {...register("fullName")} /></F>
          <Sel label="Роль" {...register("role")} options={[{id:"STUDENT",label:"Студент"},{id:"TEACHER",label:"Преподаватель"},{id:"HEAD",label:"Заведующий отделением"}]} err={errors.role?.message} />
          <F label="Должность"><Input {...register("position")} /></F>
          <F
            label={id ? "Новый пароль (если меняем)" : "Пароль (необязательно)"}
            hint={id ? undefined : "Оставьте пустым — сгенерируем и отправим на email"}
          >
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </F>
          <div className="flex items-center gap-2 pt-6">
            <input id="active" type="checkbox" {...register("isActive")} defaultChecked={initial?.isActive ?? true} />
            <Label htmlFor="active">Активен</Label>
          </div>
          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
          {info && <p className="sm:col-span-2 text-sm text-success">{info}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({
  label,
  err,
  hint,
  children,
}: {
  label: string;
  err?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
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
