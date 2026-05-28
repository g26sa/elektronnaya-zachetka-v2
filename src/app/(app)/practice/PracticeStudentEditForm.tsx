"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GradeSelect } from "@/components/forms/GradeSelect";
import { updatePracticeStudent } from "./actions-quick";

const schema = z.object({
  id: z.string().min(1),
  grade: z.string().optional(),
  gradeDate: z.string().optional(),
  place: z.string().optional(),
  orgSupervisorName: z.string().optional(),
  orgSupervisorPosition: z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

export function PracticeStudentEditForm({
  trigger,
  studentName,
  kind,
  initial,
}: {
  trigger: React.ReactNode;
  studentName: string;
  kind: "EDUCATIONAL" | "PRODUCTION" | "PREDIPLOMA";
  initial: FormInput & { place: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isEducational = kind === "EDUCATIONAL";

  const formDefaults: FormInput = {
    id: initial.id,
    grade: initial.grade ?? "",
    gradeDate: initial.gradeDate ?? "",
    place: initial.place ?? "",
    orgSupervisorName: initial.orgSupervisorName ?? "",
    orgSupervisorPosition: initial.orgSupervisorPosition ?? "",
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(formDefaults);
  };

  const str = { setValueAs: (v: unknown) => (v == null ? "" : String(v)) };

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await updatePracticeStudent(values);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оценка и данные · {studentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("id")} />
          <GradeSelect label="Оценка" {...register("grade", str)} err={errors.grade?.message} includePass={false} />
          <div className="space-y-1.5">
            <Label>Дата выставления оценки</Label>
            <Input type="date" {...register("gradeDate", str)} />
          </div>
          {!isEducational && (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Место практики</Label>
                <Input {...register("place", str)} />
              </div>
              <div className="space-y-1.5">
                <Label>Руководитель от организации (ФИО)</Label>
                <Input {...register("orgSupervisorName", str)} />
              </div>
              <div className="space-y-1.5">
                <Label>Должность</Label>
                <Input {...register("orgSupervisorPosition", str)} />
              </div>
            </>
          )}
          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
