"use client";
import { useState, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { stateExamSchema, type StateExamInput } from "@/schemas/vkr";
import { createStateExam, updateStateExam } from "./actions";
import { controlledSelectProps } from "@/components/forms/controlled-select";
import { courseFromGroupName } from "@/lib/group-course";

type Opt = { id: string; label: string };
type StudentOpt = { id: string; label: string; groupName: string; speciality: string };

export function StateExamForm({
  trigger, id, initial, students, chairs,
}: {
  trigger: React.ReactNode;
  id?: string;
  initial?: Partial<StateExamInput & { chairGekId?: string }>;
  students: StudentOpt[];
  chairs: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Cascading filters
  const [filterSpeciality, setFilterSpeciality] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  const specialities = useMemo(
    () => Array.from(new Set(students.map((s) => s.speciality).filter(Boolean))).sort(),
    [students]
  );
  const courses = useMemo(() => {
    const src = filterSpeciality ? students.filter((s) => s.speciality === filterSpeciality) : students;
    const nums = Array.from(new Set(src.map((s) => courseFromGroupName(s.groupName)).filter((c): c is number => c !== null)));
    return nums.sort((a, b) => a - b);
  }, [students, filterSpeciality]);
  const groups = useMemo(() => {
    let src = students;
    if (filterSpeciality) src = src.filter((s) => s.speciality === filterSpeciality);
    if (filterCourse) src = src.filter((s) => courseFromGroupName(s.groupName) === parseInt(filterCourse));
    return Array.from(new Set(src.map((s) => s.groupName))).sort();
  }, [students, filterSpeciality, filterCourse]);

  const filteredStudents = useMemo(() => {
    let src = students;
    if (filterSpeciality) src = src.filter((s) => s.speciality === filterSpeciality);
    if (filterCourse) src = src.filter((s) => courseFromGroupName(s.groupName) === parseInt(filterCourse));
    if (filterGroup) src = src.filter((s) => s.groupName === filterGroup);
    return src;
  }, [students, filterSpeciality, filterCourse, filterGroup]);

  const { register, handleSubmit, formState: { errors } } = useForm<StateExamInput>({
    resolver: zodResolver(stateExamSchema),
    defaultValues: {
      studentId: initial?.studentId ?? "",
      name: initial?.name ?? "",
      admission: (initial?.admission as StateExamInput["admission"]) ?? "ADMITTED",
      admissionDate: initial?.admissionDate ?? "",
      date: initial?.date ?? "",
      grade: initial?.grade ?? "",
      chairGekId: (initial as any)?.chairGekId ?? "",
      protocolNumber: initial?.protocolNumber ?? "",
    } as any,
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        if (id) await updateStateExam(id, values);
        else await createStateExam(values);
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
        <DialogHeader><DialogTitle>{id ? "Редактировать" : "Новый гос. экзамен"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          {/* Cascading filters */}
          <SelRaw
            label="Специальность"
            value={filterSpeciality}
            onChange={(v) => { setFilterSpeciality(v); setFilterCourse(""); setFilterGroup(""); }}
            options={specialities.map((s) => ({ id: s, label: s }))}
            placeholder="— все специальности —"
          />
          <SelRaw
            label="Курс"
            value={filterCourse}
            onChange={(v) => { setFilterCourse(v); setFilterGroup(""); }}
            options={courses.map((c) => ({ id: String(c), label: `${c} курс` }))}
            placeholder="— все курсы —"
            disabled={!filterSpeciality && courses.length > 4}
          />
          <SelRaw
            label="Группа"
            value={filterGroup}
            onChange={setFilterGroup}
            options={groups.map((g) => ({ id: g, label: g }))}
            placeholder={filterCourse ? "— все группы —" : "Сначала выберите курс"}
            disabled={!filterCourse}
          />
          <Sel
            label="Студент"
            {...register("studentId")}
            options={filteredStudents.map((s) => ({ id: s.id, label: `${s.label} (${s.groupName})` }))}
            err={errors.studentId?.message}
          />

          <F label="Название" err={errors.name?.message} className="sm:col-span-2">
            <Input {...register("name")} />
          </F>
          <Sel label="Допуск" {...register("admission")} options={[{id:"ADMITTED",label:"Допущен"},{id:"NOT_ADMITTED",label:"Не допущен"}]} />
          <F label="Дата допуска"><Input type="date" {...register("admissionDate")} /></F>
          <F label="Дата экзамена"><Input type="date" {...register("date")} /></F>
          <F label="Оценка"><Input {...register("grade")} /></F>
          <Sel label="Председатель ГЭК" {...(register("chairGekId" as any))} options={chairs} />
          <F label="№ протокола"><Input {...register("protocolNumber")} /></F>
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

function SelRaw({ label, value, onChange, options, placeholder, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">{placeholder ?? "— не выбрано —"}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Sel({ label, options, err, ...rest }: { label: string; options: Opt[]; err?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select {...controlledSelectProps(rest)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
        <option value="">— не выбрано —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
