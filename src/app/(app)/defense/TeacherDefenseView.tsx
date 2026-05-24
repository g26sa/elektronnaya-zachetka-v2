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
import { GradeSelect } from "@/components/forms/GradeSelect";
import { saveDefenseQuick } from "./actions-quick";
import { admissionLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { Plus, X, Printer, Pencil, Search } from "lucide-react";
import type { TeacherListFilters } from "@/lib/teacher-plan-display";

export type DefenseRow = {
  studentId: string;
  studentName: string;
  groupName: string;
  groupSpeciality: string;
  course: number;
  vkrTopic: string | null;
  admission: string | null;
  admissionDate: Date | string | null;
  date: Date | string | null;
  grade: string | null;
  chairName: string | null;
};

export function TeacherDefenseView({
  rows,
  chairs,
  initialFilters,
}: {
  rows: DefenseRow[];
  chairs: { id: string; fullName: string }[];
  initialFilters?: TeacherListFilters;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [studentId, setStudentId] = useState(initialFilters?.studentId ?? "");

  const specialities = useMemo(() => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(), [rows]);
  const afterSpec = useMemo(() => speciality ? rows.filter((r) => r.groupSpeciality === speciality) : rows, [rows, speciality]);
  const courses = useMemo(() => Array.from(new Set(afterSpec.map((r) => String(r.course)))).sort(), [afterSpec]);
  const afterCourse = useMemo(() => course ? afterSpec.filter((r) => String(r.course) === course) : afterSpec, [afterSpec, course]);
  const groups = useMemo(() => Array.from(new Set(afterCourse.map((r) => r.groupName))).sort(), [afterCourse]);
  const afterGroup = useMemo(() => groupName ? afterCourse.filter((r) => r.groupName === groupName) : afterCourse, [afterCourse, groupName]);
  const studentOpts = useMemo(() => afterGroup.map((r) => ({ id: r.studentId, label: r.studentName })), [afterGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (speciality && r.groupSpeciality !== speciality) return false;
      if (course && String(r.course) !== course) return false;
      if (groupName && r.groupName !== groupName) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (q) {
        const blob = `${r.studentName} ${r.vkrTopic ?? ""} ${r.grade ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, speciality, course, groupName, studentId]);

  const hasFilters = !!(search || speciality || course || groupName || studentId);
  const visible = !hasFilters ? filtered.slice(0, 10) : filtered;

  const reportUrl = `/print/defense-report?${new URLSearchParams({
    speciality, course, group: groupName, studentId,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по студенту, теме, оценке…" className="pl-9" />
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
            <Sel label="Курс" value={course} onChange={(v) => { setCourse(v); setGroupName(""); }} options={courses} disabled={courses.length === 0} />
            <Sel label="Группа" value={groupName} onChange={(v) => { setGroupName(v); setStudentId(""); }} options={groups} disabled={groups.length === 0} />
            <Sel
              label="Студент"
              value={studentId}
              onChange={setStudentId}
              options={studentOpts.map((s) => s.id)}
              optionsLabels={Object.fromEntries(studentOpts.map((s) => [s.id, s.label]))}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {hasFilters
                ? <>Найдено: <span className="font-medium">{filtered.length}</span></>
                : <>Показаны первые <span className="font-medium">{visible.length}</span> из {rows.length}</>}
            </span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={reportUrl} target="_blank"><Printer className="h-3 w-3 mr-1" />Отчёт</Link>
              </Button>
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
                <TableHead>Тема ВКР</TableHead>
                <TableHead>Допуск</TableHead>
                <TableHead>Дата защиты</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Председатель ГЭК</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {hasFilters ? "По выбранным фильтрам ничего не найдено." : "Студентов для защиты ВКР пока нет."}
                </TableCell></TableRow>
              ) : visible.map((r) => (
                <TableRow key={r.studentId}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.groupName}</TableCell>
                  <TableCell>{r.course}</TableCell>
                  <TableCell className="max-w-[260px]">
                    {r.vkrTopic ?? <Badge variant="outline">тема не назначена</Badge>}
                  </TableCell>
                  <TableCell>
                    {r.admission
                      ? <Badge variant={r.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(r.admission)}</Badge>
                      : <Badge variant="outline">—</Badge>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                  <TableCell>
                    {r.grade
                      ? <Badge variant={gradeIsPassing(r.grade) ? "success" : "destructive"}>{r.grade}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{r.chairName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <DefenseForm
                      chairs={chairs}
                      initial={{
                        studentId: r.studentId,
                        studentName: r.studentName,
                        vkrTopic: r.vkrTopic,
                        admission: (r.admission as "ADMITTED" | "NOT_ADMITTED" | null) ?? "ADMITTED",
                        admissionDate: r.admissionDate ? new Date(r.admissionDate).toISOString().slice(0, 10) : "",
                        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
                        grade: r.grade ?? "",
                        chairName: r.chairName ?? "",
                      }}
                      trigger={
                        r.admission
                          ? <Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                          : <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Создать</Button>
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
  admission: z.enum(["ADMITTED", "NOT_ADMITTED"]),
  admissionDate: z.string().optional(),
  date: z.string().optional(),
  grade: z.string().optional(),
  chairName: z.string().optional(),
});
type FormInput = z.infer<typeof formSchema>;

function DefenseForm({
  trigger, initial, chairs,
}: {
  trigger: React.ReactNode;
  initial: { studentId: string; studentName: string; vkrTopic: string | null; admission: "ADMITTED" | "NOT_ADMITTED"; admissionDate: string; date: string; grade: string; chairName: string };
  chairs: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: initial.studentId,
      admission: initial.admission,
      admissionDate: initial.admissionDate,
      date: initial.date,
      grade: initial.grade,
      chairName: initial.chairName,
    },
  });

  const submit = handleSubmit((values) => {
    setErr(null);
    startTransition(async () => {
      try {
        await saveDefenseQuick(values);
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
        <DialogHeader><DialogTitle>Защита ВКР</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register("studentId")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Студент</Label>
            <Input value={initial.studentName} readOnly className="bg-muted" />
          </div>
          {initial.vkrTopic && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Тема ВКР</Label>
              <Input value={initial.vkrTopic} readOnly className="bg-muted" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Допуск</Label>
            <select {...register("admission")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="ADMITTED">Допущен</option>
              <option value="NOT_ADMITTED">Не допущен</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Дата допуска</Label>
            <Input type="date" {...register("admissionDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Дата защиты</Label>
            <Input type="date" {...register("date")} />
          </div>
          <GradeSelect label="Оценка" {...register("grade")} err={errors.grade?.message} includePass={false} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Председатель ГЭК</Label>
            <select {...register("chairName")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm">
              <option value="">— не выбрано —</option>
              {chairs.map((c) => <option key={c.id} value={c.fullName}>{c.fullName}</option>)}
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

function Sel({
  label, value, onChange, options, disabled, optionsLabels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  disabled?: boolean;
  optionsLabels?: Record<string, string>;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50">
        <option value="">— все —</option>
        {options.map((o) => <option key={o} value={o}>{optionsLabels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}
