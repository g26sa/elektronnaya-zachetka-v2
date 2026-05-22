"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GradeSelect } from "@/components/forms/GradeSelect";
import { savePracticeQuick } from "./actions-quick";

export type PracticePlanSlot = {
  id: string;
  groupId: string;
  groupName: string;
  groupSpeciality: string;
  semesterId: string;
  semesterNumber: number;
  semesterYear: string;
};

export type StudentRef = {
  id: string;
  fullName: string;
  groupId: string;
};

const schema = z.object({
  id: z.string().optional(),
  semesterId: z.string().min(1, "Выберите семестр"),
  groupId: z.string().min(1, "Выберите группу"),
  studentId: z.string().min(1, "Выберите студента"),
  kind: z.enum(["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]),
  place: z.string().min(1, "Укажите место"),
  startDate: z.string().min(1, "Дата начала"),
  endDate: z.string().min(1, "Дата окончания"),
  grade: z.string().optional(),
  gradeDate: z.string().optional(),
  orgSupervisorName: z.string().optional(),
  orgSupervisorPosition: z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

export function PracticeQuickForm({
  trigger,
  planSlots,
  students,
  institutionName,
  initial,
}: {
  trigger: React.ReactNode;
  planSlots: PracticePlanSlot[];
  students: StudentRef[];
  /** Название учреждения — автоподставится в «место» для учебной практики */
  institutionName: string;
  initial?: Partial<FormInput>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [speciality, setSpeciality] = useState<string>(() => {
    if (!initial?.groupId) return "";
    return planSlots.find((s) => s.groupId === initial.groupId)?.groupSpeciality ?? "";
  });

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: initial?.id,
      semesterId: initial?.semesterId ?? "",
      groupId: initial?.groupId ?? "",
      studentId: initial?.studentId ?? "",
      kind: (initial?.kind as FormInput["kind"]) ?? "EDUCATIONAL",
      place: initial?.place ?? "",
      startDate: initial?.startDate ?? "",
      endDate: initial?.endDate ?? "",
      grade: initial?.grade ?? "",
      gradeDate: initial?.gradeDate ?? "",
      orgSupervisorName: initial?.orgSupervisorName ?? "",
      orgSupervisorPosition: initial?.orgSupervisorPosition ?? "",
    },
  });

  const kind = useWatch({ control, name: "kind" });
  const groupId = useWatch({ control, name: "groupId" });
  const isEducational = kind === "EDUCATIONAL";

  // Автозаполнение места для учебной практики
  useEffect(() => {
    if (isEducational) {
      setValue("place", institutionName);
    } else if (initial?.place && initial.kind !== "EDUCATIONAL") {
      // при возврате к ручному вводу — оставляем то, что было
    } else {
      setValue("place", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Каскад: специальность → группа → семестр → студент
  const specialities = useMemo(
    () => Array.from(new Set(planSlots.map((s) => s.groupSpeciality).filter(Boolean))).sort(),
    [planSlots]
  );
  const groups = useMemo(() => {
    const filtered = speciality ? planSlots.filter((s) => s.groupSpeciality === speciality) : planSlots;
    return uniqBy(filtered, (s) => s.groupId).map((s) => ({ id: s.groupId, label: s.groupName }));
  }, [planSlots, speciality]);
  const semesters = useMemo(() => {
    const filtered = planSlots.filter((s) =>
      (!speciality || s.groupSpeciality === speciality) &&
      (!groupId || s.groupId === groupId)
    );
    return uniqBy(filtered, (s) => s.semesterId).map((s) => ({
      id: s.semesterId,
      label: `${s.semesterNumber} семестр`,
    }));
  }, [planSlots, speciality, groupId]);

  const studentsInGroup = useMemo(
    () => students.filter((s) => !groupId || s.groupId === groupId),
    [students, groupId]
  );

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await savePracticeQuick(values);
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
          <DialogTitle>{initial?.id ? "Редактирование практики" : "Новая практика"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          {initial?.id && <input type="hidden" {...register("id")} />}

          {/* Специальность → Группа → Семестр → Студент */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Специальность</Label>
            <select
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— все —</option>
              {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Sel label="Группа" {...register("groupId")} options={groups} err={errors.groupId?.message} disabled={groups.length === 0} />
          <Sel label="Семестр" {...register("semesterId")} options={semesters} err={errors.semesterId?.message} disabled={semesters.length === 0} />
          <Sel
            label="Студент"
            {...register("studentId")}
            options={studentsInGroup.map((s) => ({ id: s.id, label: s.fullName }))}
            err={errors.studentId?.message}
            disabled={studentsInGroup.length === 0}
            className="sm:col-span-2"
          />

          {/* Вид практики */}
          <Sel
            label="Вид практики"
            {...register("kind")}
            options={[
              { id: "EDUCATIONAL", label: "Учебная" },
              { id: "PRODUCTION", label: "Производственная" },
              { id: "PREDIPLOMA", label: "Преддипломная" },
            ]}
            err={errors.kind?.message}
          />

          {/* Место */}
          <F label={isEducational ? "Место (учреждение)" : "Место (организация)"} err={errors.place?.message}>
            <Input
              {...register("place")}
              readOnly={isEducational}
              className={isEducational ? "bg-muted" : ""}
            />
          </F>

          {/* Даты периода */}
          <F label="Дата начала" err={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </F>
          <F label="Дата окончания" err={errors.endDate?.message}>
            <Input type="date" {...register("endDate")} />
          </F>

          {/* Оценка опциональна — практику можно зафиксировать заранее */}
          <GradeSelect label="Оценка (необязательно)" {...register("grade")} err={errors.grade?.message} includePass={false} />
          <F label="Дата выставления оценки" err={errors.gradeDate?.message}>
            <Input type="date" {...register("gradeDate")} />
          </F>

          {/* Орг. руководитель — только для производственной/преддипломной */}
          {!isEducational && (
            <>
              <F label="Руководитель от организации (ФИО)">
                <Input {...register("orgSupervisorName")} />
              </F>
              <F label="Должность от организации">
                <Input {...register("orgSupervisorPosition")} />
              </F>
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

function uniqBy<T, K>(arr: T[], key: (x: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function F({ label, err, children, className }: { label: string; err?: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}{err && <p className="text-xs text-destructive">{err}</p>}</div>;
}

function Sel({
  label, options, err, className, ...rest
}: { label: string; options: { id: string; label: string }[]; err?: string; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      <select {...rest} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
        <option value="">— не выбрано —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
