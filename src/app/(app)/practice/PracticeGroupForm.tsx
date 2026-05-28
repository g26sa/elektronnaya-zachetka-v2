"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPracticeForGroup } from "./actions-quick";
import type { PracticePlanSlot } from "./practice-types";
import {
  filterGroupNamesByCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";
import { controlledSelectProps } from "@/components/forms/controlled-select";

const schema = z.object({
  semesterId: z.string().min(1, "Выберите семестр"),
  groupId: z.string().min(1, "Выберите группу"),
  kind: z.enum(["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]),
  place: z.string().optional(),
  startDate: z.string().min(1, "Дата начала"),
  endDate: z.string().min(1, "Дата окончания"),
});
type FormInput = z.infer<typeof schema>;

export function PracticeGroupForm({
  trigger,
  planSlots,
  institutionName,
}: {
  trigger: React.ReactNode;
  planSlots: PracticePlanSlot[];
  institutionName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [speciality, setSpeciality] = useState("");
  const [planCourse, setPlanCourse] = useState("");

  const emptyValues: FormInput = {
    semesterId: "",
    groupId: "",
    kind: "EDUCATIONAL",
    place: institutionName,
    startDate: "",
    endDate: "",
  };

  const { register, handleSubmit, control, setValue, formState: { errors }, reset } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const kind = useWatch({ control, name: "kind" }) ?? "EDUCATIONAL";
  const groupId = useWatch({ control, name: "groupId" }) ?? "";
  const isEducational = kind === "EDUCATIONAL";

  useEffect(() => {
    if (isEducational) setValue("place", institutionName, { shouldDirty: false });
    else setValue("place", "", { shouldDirty: false });
  }, [isEducational, institutionName, setValue]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      reset(emptyValues);
      setSpeciality("");
      setPlanCourse("");
    }
  };

  const specialities = useMemo(
    () => Array.from(new Set(planSlots.map((s) => s.groupSpeciality).filter(Boolean))).sort(),
    [planSlots]
  );
  const slotNames = useMemo(() => {
    const base = speciality ? planSlots.filter((s) => s.groupSpeciality === speciality) : planSlots;
    return base.map((s) => s.groupName);
  }, [planSlots, speciality]);

  const courses = useMemo(() => uniqueCoursesFromGroupNames(slotNames), [slotNames]);

  const groups = useMemo(() => {
    if (!planCourse) return [];
    const names = filterGroupNamesByCourse(slotNames, planCourse);
    const base = speciality ? planSlots.filter((s) => s.groupSpeciality === speciality) : planSlots;
    return uniqBy(
      base.filter((s) => names.includes(s.groupName)),
      (s) => s.groupId
    ).map((s) => ({ id: s.groupId, label: s.groupName }));
  }, [planSlots, speciality, planCourse, slotNames]);

  const semesters = useMemo(() => {
    const filtered = planSlots.filter(
      (s) =>
        (!speciality || s.groupSpeciality === speciality) &&
        (!planCourse || filterGroupNamesByCourse([s.groupName], planCourse).length > 0) &&
        (!groupId || s.groupId === groupId)
    );
    return uniqBy(filtered, (s) => s.semesterId).map((s) => ({
      id: s.semesterId,
      label: `${s.semesterNumber} семестр (${s.semesterYear})`,
    }));
  }, [planSlots, speciality, groupId]);

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        const msg = await createPracticeForGroup(values);
        reset(emptyValues);
        setSpeciality("");
        setPlanCourse("");
        setOpen(false);
        router.refresh();
        if (msg) alert(msg);
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
          <DialogTitle>Новая практика для группы</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("place")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Специальность</Label>
            <select
              value={speciality ?? ""}
              onChange={(e) => {
                setSpeciality(e.target.value);
                setPlanCourse("");
                setValue("groupId", "");
                setValue("semesterId", "");
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— все —</option>
              {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Курс</Label>
            <select
              value={planCourse ?? ""}
              onChange={(e) => {
                setPlanCourse(e.target.value);
                setValue("groupId", "");
                setValue("semesterId", "");
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— выберите курс —</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <Sel
            label="Группа"
            {...register("groupId", { setValueAs: (v) => (v == null ? "" : String(v)) })}
            options={groups}
            err={errors.groupId?.message}
            disabled={!planCourse || groups.length === 0}
            hint={!planCourse ? "Сначала выберите курс" : undefined}
          />
          <Sel label="Семестр" {...register("semesterId", { setValueAs: (v) => (v == null ? "" : String(v)) })} options={semesters} err={errors.semesterId?.message} disabled={semesters.length === 0} />

          <Sel
            label="Вид практики"
            {...register("kind", { setValueAs: (v) => (v == null ? "" : String(v)) })}
            options={[
              { id: "EDUCATIONAL", label: "Учебная" },
              { id: "PRODUCTION", label: "Производственная" },
              { id: "PREDIPLOMA", label: "Преддипломная" },
            ]}
            err={errors.kind?.message}
          />

          {isEducational ? (
            <F label="Место (учреждение)" className="sm:col-span-1">
              <Input value={institutionName} readOnly className="bg-muted" />
            </F>
          ) : (
            <F label="Место по умолчанию (необязательно)" err={errors.place?.message} className="sm:col-span-1">
              <Input {...register("place", { setValueAs: (v) => (v == null ? "" : String(v)) })} placeholder="Уточните у каждого студента в таблице" />
            </F>
          )}

          <F label="Дата начала" err={errors.startDate?.message}>
            <Input type="date" {...register("startDate", { setValueAs: (v) => (v == null ? "" : String(v)) })} />
          </F>
          <F label="Дата окончания" err={errors.endDate?.message}>
            <Input type="date" {...register("endDate", { setValueAs: (v) => (v == null ? "" : String(v)) })} />
          </F>

          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Создание…" : "Добавить группу"}</Button>
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
  label, options, err, className, hint, ...rest
}: {
  label: string;
  options: { id: string; label: string }[];
  err?: string;
  className?: string;
  hint?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      <select {...controlledSelectProps(rest)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
        <option value="">{hint ?? "— не выбрано —"}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
