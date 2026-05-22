"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GradeSelect } from "@/components/forms/GradeSelect";
import { saveCourseWorkQuick } from "./actions-quick";

export type PlanSlot = {
  /** id назначения из плана — не используется в форме, только для подсчёта валидных комбинаций */
  id: string;
  disciplineId: string;
  disciplineName: string;
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
  disciplineId: z.string().min(1, "Выберите дисциплину"),
  groupId: z.string().min(1, "Выберите группу"),
  studentId: z.string().min(1, "Выберите студента"),
  topic: z.string().min(1, "Введите тему"),
  grade: z.string().optional(),
  date: z.string().optional(),
  assignedAt: z.string().optional(),
});
type FormInput = z.infer<typeof schema>;

export function CourseWorkQuickForm({
  trigger,
  planSlots,
  students,
  initial,
}: {
  trigger: React.ReactNode;
  planSlots: PlanSlot[];
  students: StudentRef[];
  initial?: Partial<FormInput>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: initial?.id,
      semesterId: initial?.semesterId ?? "",
      disciplineId: initial?.disciplineId ?? "",
      groupId: initial?.groupId ?? "",
      studentId: initial?.studentId ?? "",
      topic: initial?.topic ?? "",
      grade: initial?.grade ?? "",
      date: initial?.date ?? "",
      assignedAt: initial?.assignedAt ?? "",
    },
  });

  const groupId = useWatch({ control, name: "groupId" });
  const semesterId = useWatch({ control, name: "semesterId" });

  // Чисто UI-фильтр для каскада, в БД не сохраняется
  const [speciality, setSpeciality] = useState<string>(() => {
    if (!initial?.groupId) return "";
    return planSlots.find((s) => s.groupId === initial.groupId)?.groupSpeciality ?? "";
  });

  // Каскад: специальность → группа → семестр → дисциплина → студент
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
  const disciplines = useMemo(() => {
    const filtered = planSlots.filter((s) =>
      (!speciality || s.groupSpeciality === speciality) &&
      (!groupId || s.groupId === groupId) &&
      (!semesterId || s.semesterId === semesterId)
    );
    return uniqBy(filtered, (s) => s.disciplineId).map((s) => ({ id: s.disciplineId, label: s.disciplineName }));
  }, [planSlots, speciality, groupId, semesterId]);

  const studentsInGroup = useMemo(
    () => students.filter((s) => !groupId || s.groupId === groupId),
    [students, groupId]
  );

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveCourseWorkQuick(values);
        if (!values.id) reset({ ...values, id: undefined, topic: "", grade: "", date: "", studentId: "" });
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
          <DialogTitle>{initial?.id ? "Редактирование курсовой" : "Новая курсовая работа"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          {initial?.id && <input type="hidden" {...register("id")} />}

          {/* 1. Специальность — каскад начинается отсюда */}
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

          {/* 2. Группа */}
          <Sel
            label="Группа"
            {...register("groupId")}
            options={groups}
            err={errors.groupId?.message}
            disabled={groups.length === 0}
          />

          {/* 3. Семестр (просто цифра) */}
          <Sel
            label="Семестр"
            {...register("semesterId")}
            options={semesters}
            err={errors.semesterId?.message}
            disabled={semesters.length === 0}
          />

          {/* 4. Дисциплина */}
          <Sel
            label="Дисциплина"
            {...register("disciplineId")}
            options={disciplines}
            err={errors.disciplineId?.message}
            disabled={disciplines.length === 0}
            className="sm:col-span-2"
          />

          {/* 5. Студент */}
          <Sel
            label="Студент"
            {...register("studentId")}
            options={studentsInGroup.map((s) => ({ id: s.id, label: s.fullName }))}
            err={errors.studentId?.message}
            disabled={studentsInGroup.length === 0}
            className="sm:col-span-2"
          />

          {/* 6. Тема */}
          <F label="Тема" err={errors.topic?.message} className="sm:col-span-2">
            <Input {...register("topic")} />
          </F>

          {/* 7. Оценка (необязательно) и даты */}
          <GradeSelect
            label="Оценка (необязательно)"
            {...register("grade")}
            err={errors.grade?.message}
            includePass={false}
          />
          <F label="Дата выставления оценки" err={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </F>
          <F label="Дата выдачи темы" err={errors.assignedAt?.message} className="sm:col-span-2">
            <Input type="date" {...register("assignedAt")} />
          </F>

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
