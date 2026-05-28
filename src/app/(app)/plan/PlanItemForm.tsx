"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { planItemSchema, type PlanItemInput } from "@/schemas/plan";
import { createPlanItem, updatePlanItem } from "./actions";
import {
  PlanTeachingKindValues,
  teachingKindLabel,
  type PlanTeachingKind,
  type TeachingKind,
} from "@/types/enums";
import {
  courseFromGroupName,
  filterGroupNamesByCourse,
  resolveSemesterId,
  semesterPartsFromId,
  uniqueCoursesFromGroupNames,
  type SemesterRef,
} from "@/lib/group-course";
import { controlledSelectProps } from "@/components/forms/controlled-select";

type Opt = { id: string; label: string };
type GroupOpt = { id: string; name: string; speciality: string };
type StudentOpt = { id: string; label: string; groupId: string };

export function PlanItemForm({
  trigger,
  id,
  initial,
  teachers,
  semesters,
  disciplines,
  groups,
  students,
  defaultKind,
  isHead = false,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<PlanItemInput>;
  teachers: Opt[];
  semesters: SemesterRef[];
  disciplines: Opt[];
  groups: GroupOpt[];
  students: StudentOpt[];
  defaultKind?: PlanTeachingKind;
  isHead?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const initialStudent = students.find((s) => s.id === initial?.studentId);
  const initialGroup =
    groups.find((g) => g.id === initial?.groupId) ??
    groups.find((g) => g.id === initialStudent?.groupId);
  const initialParts = semesterPartsFromId(semesters, initial?.semesterId);
  const [planSpeciality, setPlanSpeciality] = useState(() => initialGroup?.speciality ?? "");
  const [planCourse, setPlanCourse] = useState(
    () =>
      initialParts.course ||
      (initialGroup ? String(courseFromGroupName(initialGroup.name) ?? "") : "")
  );
  const [semesterNum, setSemesterNum] = useState(initialParts.semesterNumber || "");

  const {
    register, handleSubmit, control, setValue, formState: { errors },
  } = useForm<PlanItemInput>({
    resolver: zodResolver(planItemSchema),
    defaultValues: {
      teacherId: initial?.teacherId ?? "",
      kind: (PlanTeachingKindValues.includes(initial?.kind as PlanTeachingKind)
        ? initial?.kind
        : defaultKind ?? "ASSESSMENT") as TeachingKind,
      controlForm: (initial as any)?.controlForm ?? "",
      semesterId: initial?.semesterId ?? "",
      disciplineId: initial?.disciplineId ?? "",
      groupId: initial?.groupId ?? initialStudent?.groupId ?? "",
      studentId: initial?.studentId ?? "",
    },
  });

  const kind = useWatch({ control, name: "kind" });
  const groupIdVal = useWatch({ control, name: "groupId" });

  const isVkr = kind === "VKR";
  const needsDiscipline = kind === "ASSESSMENT" || kind === "COURSEWORK";
  const needsHours = kind === "ASSESSMENT";
  const needsGroupSemester = kind === "ASSESSMENT" || kind === "COURSEWORK" || kind === "PRACTICE";

  const specialities = useMemo(
    () => Array.from(new Set(groups.map((g) => g.speciality).filter(Boolean))).sort(),
    [groups]
  );
  const groupsAfterSpec = useMemo(
    () => (planSpeciality ? groups.filter((g) => g.speciality === planSpeciality) : groups),
    [groups, planSpeciality]
  );
  const courses = useMemo(
    () => uniqueCoursesFromGroupNames(groupsAfterSpec.map((g) => g.name)),
    [groupsAfterSpec]
  );
  const groupOptions = useMemo(() => {
    if (!planCourse) return [];
    const names = filterGroupNamesByCourse(groupsAfterSpec.map((g) => g.name), planCourse);
    return groupsAfterSpec
      .filter((g) => names.includes(g.name))
      .map((g) => ({ id: g.id, label: g.name }));
  }, [groupsAfterSpec, planCourse]);

  const studentOptions = useMemo(() => {
    if (!isVkr || !groupIdVal) return [];
    return students.filter((s) => s.groupId === groupIdVal);
  }, [isVkr, groupIdVal, students]);

  const kindOptions: Opt[] = useMemo(() => {
    const assignable: Opt[] = PlanTeachingKindValues.map((k) => ({
      id: k,
      label: teachingKindLabel(k),
    }));
    const current = initial?.kind;
    if (
      current &&
      !PlanTeachingKindValues.includes(current as PlanTeachingKind) &&
      !assignable.some((o) => o.id === current)
    ) {
      assignable.push({ id: current, label: teachingKindLabel(current) });
    }
    return assignable;
  }, [initial?.kind]);

  useEffect(() => {
    if (!needsDiscipline) setValue("disciplineId", "");
    if (!needsGroupSemester) {
      if (!isVkr) {
        setValue("groupId", "");
        setPlanCourse("");
        setSemesterNum("");
      }
      setValue("semesterId", "");
    }
    if (!isVkr) setValue("studentId", "");
  }, [kind, needsDiscipline, needsGroupSemester, isVkr, setValue]);

  useEffect(() => {
    if (!needsGroupSemester || !planCourse || !semesterNum) {
      if (needsGroupSemester) setValue("semesterId", "");
      return;
    }
    const sid = resolveSemesterId(semesters, parseInt(planCourse, 10), parseInt(semesterNum, 10));
    setValue("semesterId", sid ?? "");
  }, [planCourse, semesterNum, semesters, needsGroupSemester, setValue]);

  const prevGroupRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isVkr) {
      prevGroupRef.current = undefined;
      return;
    }
    const prev = prevGroupRef.current;
    prevGroupRef.current = groupIdVal || undefined;
    if (prev !== undefined && prev !== groupIdVal) {
      setValue("studentId", "");
    }
  }, [groupIdVal, isVkr, setValue]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && id) {
      const g =
        groups.find((x) => x.id === initial?.groupId) ??
        groups.find((x) => x.id === students.find((s) => s.id === initial?.studentId)?.groupId);
      const parts = semesterPartsFromId(semesters, initial?.semesterId);
      setPlanCourse(parts.course || (g ? String(courseFromGroupName(g.name) ?? "") : ""));
      setSemesterNum(parts.semesterNumber || "");
    }
    if (next && !id) {
      setPlanSpeciality("");
      setPlanCourse("");
      setSemesterNum("");
    }
  };

  const submit = handleSubmit((values) => {
    setErr(null);
    if (needsGroupSemester) {
      if (!planCourse) {
        setErr("Выберите курс");
        return;
      }
      if (!values.groupId) {
        setErr("Выберите группу");
        return;
      }
      if (!semesterNum) {
        setErr("Выберите семестр");
        return;
      }
      if (!values.semesterId) {
        setErr("Не найден семестр для выбранного курса. Проверьте справочник семестров.");
        return;
      }
    }
    if (isVkr) {
      if (!planCourse) {
        setErr("Выберите курс");
        return;
      }
      if (!values.groupId) {
        setErr("Выберите группу");
        return;
      }
      if (!values.studentId) {
        setErr("Выберите студента");
        return;
      }
    }
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          notes: null,
          hours:
            typeof values.hours === "number" && !Number.isNaN(values.hours)
              ? values.hours
              : null,
        };
        if (id) await updatePlanItem(id, payload);
        else await createPlanItem(payload);
        setOpen(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  const courseGroupFields = (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Специальность</Label>
        <select
          value={planSpeciality ?? ""}
          onChange={(e) => {
            setPlanSpeciality(e.target.value);
            setPlanCourse("");
            setValue("groupId", "");
            if (isVkr) setValue("studentId", "");
            if (needsGroupSemester) setSemesterNum("");
          }}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все специальности —</option>
          {specialities.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Курс</Label>
        <select
          value={planCourse ?? ""}
          onChange={(e) => {
            setPlanCourse(e.target.value);
            setValue("groupId", "");
            if (isVkr) setValue("studentId", "");
            if (needsGroupSemester) setSemesterNum("");
          }}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— выберите курс —</option>
          {courses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <Sel
        label="Группа"
        {...register("groupId")}
        options={groupOptions}
        disabled={!planCourse || groupOptions.length === 0}
        hint={!planCourse ? "Сначала выберите курс" : undefined}
      />
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{id ? "Редактировать назначение" : "Новое назначение"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("semesterId")} />
          <Sel label="Преподаватель" {...register("teacherId")} options={teachers} err={errors.teacherId?.message} />
          <Sel
            label="Тип работы"
            {...register("kind")}
            options={kindOptions}
            err={errors.kind?.message}
          />
          {needsGroupSemester && isHead && kind === "ASSESSMENT" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Форма контроля</Label>
              <select
                {...register("controlForm")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">— не указана —</option>
                <option value="EXAM">Экзамен</option>
                <option value="CREDIT">Зачёт</option>
                <option value="GRADED_CREDIT">Дифференцированный зачёт</option>
              </select>
            </div>
          )}
          {needsGroupSemester && (
            <>
              {courseGroupFields}
              <div className="space-y-1.5">
                <Label>Семестр</Label>
                <select
                  value={semesterNum ?? ""}
                  onChange={(e) => setSemesterNum(e.target.value)}
                  disabled={!planCourse}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
                >
                  <option value="">— выберите —</option>
                  <option value="1">1 семестр</option>
                  <option value="2">2 семестр</option>
                </select>
              </div>
            </>
          )}
          {isVkr && (
            <>
              {courseGroupFields}
              <Sel
                label="Студент"
                {...register("studentId")}
                options={studentOptions}
                disabled={!groupIdVal || studentOptions.length === 0}
                hint={!groupIdVal ? "Сначала выберите группу" : undefined}
                className="sm:col-span-2"
              />
            </>
          )}
          {needsDiscipline && (
            <Sel label="Дисциплина" {...register("disciplineId")} options={disciplines} />
          )}
          {needsHours && (
            <F label="Часы по плану">
              <Input
                type="number"
                min={0}
                {...register("hours", {
                  setValueAs: (v) => {
                    if (v === "" || v == null) return undefined;
                    const n = Number(v);
                    return Number.isNaN(n) ? undefined : n;
                  },
                })}
              />
            </F>
          )}

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

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}</div>;
}
function Sel({
  label, options, err, className, hint, disabled, ...rest
}: {
  label: string;
  options: Opt[];
  err?: string;
  className?: string;
  hint?: string;
  disabled?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      <select
        {...controlledSelectProps(rest)}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">{hint ?? "— не выбрано —"}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
