"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveVkrQuick } from "./actions-quick";
import { admissionLabel, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useWatch } from "react-hook-form";
import { bindSelect } from "@/lib/rhf-select";
import { Plus, X, Printer, Pencil, Search } from "lucide-react";
import type { TeacherListFilters } from "@/lib/teacher-plan-display";
import { filterGroupNamesByCourse, groupMatchesCourse, uniqueCoursesFromGroupNames } from "@/lib/group-course";

export type VkrRow = {
  id: string | null;       // null если ВКР ещё не создана для этого студента
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  groupSpeciality: string;
  course: number;
  topic: string | null;
  type: string | null;
  approvedOrder: string | null;
  approvedDate: Date | string | null;
  admission: "ADMITTED" | "NOT_ADMITTED" | null;
  admissionDate: Date | string | null;
};

export function TeacherVkrView({
  rows,
  vkrTypes,
  initialFilters,
}: {
  rows: VkrRow[];
  vkrTypes: { id: string; name: string }[];
  initialFilters?: TeacherListFilters;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [studentId, setStudentId] = useState(initialFilters?.studentId ?? "");

  const specialities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(),
    [rows]
  );
  const afterSpec = useMemo(() => speciality ? rows.filter((r) => r.groupSpeciality === speciality) : rows, [rows, speciality]);
  const courses = useMemo(
    () => uniqueCoursesFromGroupNames(afterSpec.map((r) => r.groupName)),
    [afterSpec]
  );
  const groups = useMemo(
    () => filterGroupNamesByCourse(afterSpec.map((r) => r.groupName), course),
    [afterSpec, course]
  );
  const afterCourse = useMemo(
    () => (course ? afterSpec.filter((r) => groupMatchesCourse(r.groupName, course)) : afterSpec),
    [afterSpec, course]
  );
  const afterGroup = useMemo(() => groupName ? afterCourse.filter((r) => r.groupName === groupName) : afterCourse, [afterCourse, groupName]);
  const studentOpts = useMemo(() => afterGroup.map((r) => ({ id: r.studentId, label: r.studentName })), [afterGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (speciality && r.groupSpeciality !== speciality) return false;
      if (course && !groupMatchesCourse(r.groupName, course)) return false;
      if (groupName && r.groupName !== groupName) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (q) {
        const blob = `${r.studentName} ${r.topic ?? ""} ${r.type ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, speciality, course, groupName, studentId]);

  const hasFilters = !!(search || speciality || course || groupName || studentId);
  const visible = !hasFilters ? filtered.slice(0, 10) : filtered;

  const reportUrl = `/print/vkr-report?${new URLSearchParams({
    speciality, course, group: groupName, studentId,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по студенту, теме, виду…" className="pl-9" />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Sel label="Специальность" value={speciality} onChange={(v) => { setSpeciality(v); setCourse(""); setGroupName(""); }} options={specialities} />
            <Sel label="Курс" value={course} onChange={(v) => { setCourse(v); setGroupName(""); }} options={courses.map(String)} disabled={courses.length === 0} />
            <Sel
              label="Группа"
              value={groupName}
              onChange={(v) => { setGroupName(v); setStudentId(""); }}
              options={groups}
              disabled={!course || groups.length === 0}
              emptyLabel={course ? "— все —" : "Сначала курс"}
            />
            <Sel
              label="Студент"
              value={studentId}
              onChange={setStudentId}
              options={studentOpts.map((s) => s.id)}
              optionsLabels={Object.fromEntries(studentOpts.map((s) => [s.id, s.label]))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={reportUrl} target="_blank"><Printer className="h-3 w-3 mr-1" />Отчёт</Link>
              </Button>
              <VkrAddForm
                rows={rows}
                vkrTypes={vkrTypes}
                trigger={<Button size="sm"><Plus className="h-3 w-3 mr-1" />Добавить</Button>}
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSpeciality(""); setCourse(""); setGroupName(""); setStudentId(""); }}>
                  <X className="h-3 w-3 mr-1" />Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Студент</TableHead>
                <TableHead>Группа</TableHead>
                <TableHead>Курс</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Вид</TableHead>
                <TableHead>Допуск к защите</TableHead>
                <TableHead>Приказ</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {hasFilters
                    ? "По выбранным фильтрам записей нет."
                    : "ВКР пока нет. Нажмите «Добавить ВКР» чтобы создать запись."}
                </TableCell></TableRow>
              ) : visible.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.groupName}</TableCell>
                  <TableCell>{r.course}</TableCell>
                  <TableCell className="max-w-[280px]">
                    {r.topic ? <span title={r.topic}>{r.topic}</span> : <Badge variant="outline">тема не выдана</Badge>}
                  </TableCell>
                  <TableCell>{r.type ?? "—"}</TableCell>
                  <TableCell>
                    {r.admission ? (
                      <Badge variant={r.admission === "ADMITTED" ? "success" : "destructive"}>
                        {admissionLabel(r.admission)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">не указан</Badge>
                    )}
                    {r.admission === "ADMITTED" && r.admissionDate && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(r.admissionDate)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {r.approvedOrder ? <>{r.approvedOrder}<br/>{formatDate(r.approvedDate)}</> : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <VkrForm
                      vkrTypes={vkrTypes}
                      initial={{
                        studentId: r.studentId,
                        studentName: r.studentName,
                        topic: r.topic ?? "",
                        type: r.type ?? "",
                        approvedOrder: r.approvedOrder ?? "",
                        approvedDate: r.approvedDate ? new Date(r.approvedDate).toISOString().slice(0, 10) : "",
                        admission: r.admission ?? "",
                      }}
                      trigger={
                        r.id
                          ? <Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                          : <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Выдать тему</Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(1, "Введите тему"),
  type: z.string().optional(),
  approvedOrder: z.string().optional(),
  approvedDate: z.string().optional(),
  admission: z.enum(["", "ADMITTED", "NOT_ADMITTED"]).optional(),
});
type FormInput = z.infer<typeof formSchema>;

function VkrForm({
  trigger, initial, vkrTypes,
}: {
  trigger: React.ReactNode;
  initial: {
    studentId: string;
    studentName: string;
    topic: string;
    type: string;
    approvedOrder: string;
    approvedDate: string;
    admission: "" | "ADMITTED" | "NOT_ADMITTED";
  };
  vkrTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: initial.studentId,
      topic: initial.topic ?? "",
      type: initial.type ?? "",
      approvedOrder: initial.approvedOrder ?? "",
      approvedDate: initial.approvedDate ?? "",
      admission: initial.admission ?? "",
    },
  });

  const typeVal = useWatch({ control, name: "type" }) ?? "";
  const admissionVal = useWatch({ control, name: "admission" }) ?? "";

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveVkrQuick({
          ...values,
          admission:
            values.admission === "ADMITTED" || values.admission === "NOT_ADMITTED"
              ? values.admission
              : null,
        });
        setOpen(false);
        router.refresh();
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
          <DialogTitle>{initial.topic ? "Редактирование ВКР" : "Назначение темы ВКР"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("studentId")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Студент</Label>
            <Input value={initial.studentName} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Тема</Label>
            <Input {...register("topic")} />
            {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Вид</Label>
            <select {...bindSelect(register("type"), typeVal)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— не выбрано —</option>
              {vkrTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Приказ об утверждении</Label>
            <Input {...register("approvedOrder")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Дата приказа</Label>
            <Input type="date" {...register("approvedDate")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Допуск к защите</Label>
            <select
              {...bindSelect(register("admission"), admissionVal)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— не указан —</option>
              <option value="ADMITTED">Допущен</option>
              <option value="NOT_ADMITTED">Не допущен</option>
            </select>
            <p className="text-xs text-muted-foreground">
              При «Допущен» дата допуска сохранится автоматически, студент появится во вкладке «Защита».
            </p>
          </div>
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

function Sel({
  label, value, onChange, options, disabled, optionsLabels, emptyLabel = "— все —",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  disabled?: boolean;
  optionsLabels?: Record<string, string>;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
        <option value="">{emptyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{optionsLabels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Форма «Добавить» с полным каскадом: специальность → курс → группа → студент
// ────────────────────────────────────────────────────────────────────────────

const addSchema = z.object({
  speciality: z.string().min(1, "Выберите специальность"),
  course: z.string().min(1, "Выберите курс"),
  groupName: z.string().min(1, "Выберите группу"),
  studentId: z.string().min(1, "Выберите студента"),
  topic: z.string().min(1, "Введите тему"),
  type: z.string().optional(),
  approvedOrder: z.string().optional(),
  approvedDate: z.string().optional(),
  admission: z.enum(["", "ADMITTED", "NOT_ADMITTED"]).optional(),
});
type AddFormInput = z.infer<typeof addSchema>;

function VkrAddForm({
  trigger, rows, vkrTypes,
}: {
  trigger: React.ReactNode;
  rows: VkrRow[];
  vkrTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<AddFormInput>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      speciality: "",
      course: "",
      groupName: "",
      studentId: "",
      topic: "",
      type: "",
      approvedOrder: "",
      approvedDate: "",
      admission: "",
    },
  });

  const speciality = useWatch({ control, name: "speciality" }) ?? "";
  const course = useWatch({ control, name: "course" }) ?? "";
  const groupName = useWatch({ control, name: "groupName" }) ?? "";
  const addStudentIdVal = useWatch({ control, name: "studentId" }) ?? "";
  const addTypeVal = useWatch({ control, name: "type" }) ?? "";
  const addAdmissionVal = useWatch({ control, name: "admission" }) ?? "";

  // Каскад
  const specialities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(),
    [rows]
  );
  const afterSpecRows = useMemo(
    () => (speciality ? rows.filter((r) => r.groupSpeciality === speciality) : rows),
    [rows, speciality]
  );
  const courses = useMemo(
    () => uniqueCoursesFromGroupNames(afterSpecRows.map((r) => r.groupName)),
    [afterSpecRows]
  );
  const groups = useMemo(
    () => filterGroupNamesByCourse(afterSpecRows.map((r) => r.groupName), course),
    [afterSpecRows, course]
  );
  const students = useMemo(() => {
    const f = afterSpecRows.filter(
      (r) =>
        (!course || groupMatchesCourse(r.groupName, course)) &&
        (!groupName || r.groupName === groupName)
    );
    return f.map((r) => ({ id: r.studentId, label: r.studentName, hasVkr: !!r.id }));
  }, [afterSpecRows, course, groupName]);

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveVkrQuick({
          studentId: values.studentId,
          topic: values.topic,
          type: values.type,
          approvedOrder: values.approvedOrder,
          approvedDate: values.approvedDate,
          admission:
            values.admission === "ADMITTED" || values.admission === "NOT_ADMITTED"
              ? values.admission
              : null,
        });
        reset();
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErr(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Новая ВКР</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          {/* Каскад */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Специальность</Label>
            <select {...bindSelect(register("speciality"), speciality)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— выберите —</option>
              {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.speciality && <p className="text-xs text-destructive">{errors.speciality.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Курс</Label>
            <select {...bindSelect(register("course"), course)} disabled={!speciality}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
              <option value="">— выберите —</option>
              {courses.map((c) => <option key={c} value={String(c)}>{c}</option>)}
            </select>
            {errors.course && <p className="text-xs text-destructive">{errors.course.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Группа</Label>
            <select {...bindSelect(register("groupName"), groupName)} disabled={!course}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
              <option value="">— выберите —</option>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {errors.groupName && <p className="text-xs text-destructive">{errors.groupName.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Студент</Label>
            <select {...bindSelect(register("studentId"), addStudentIdVal)} disabled={!groupName}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
              <option value="">— выберите —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.hasVkr ? " (тема уже выдана — будет перезаписана)" : ""}
                </option>
              ))}
            </select>
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
          </div>

          {/* Тема + вид + приказ */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Тема</Label>
            <Input {...register("topic")} />
            {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Вид</Label>
            <select {...bindSelect(register("type"), addTypeVal)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— не выбрано —</option>
              {vkrTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Приказ об утверждении</Label>
            <Input {...register("approvedOrder")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Дата приказа</Label>
            <Input type="date" {...register("approvedDate")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Допуск к защите</Label>
            <select
              {...bindSelect(register("admission"), addAdmissionVal)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">— не указан —</option>
              <option value="ADMITTED">Допущен</option>
              <option value="NOT_ADMITTED">Не допущен</option>
            </select>
          </div>

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
