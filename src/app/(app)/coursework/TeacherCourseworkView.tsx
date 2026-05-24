"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CourseWorkQuickForm, type PlanSlot, type StudentRef } from "./CourseWorkQuickForm";
import { deleteCourseWork } from "./actions";
import { gradeIsPassing, formatDate } from "@/lib/utils";
import { Plus, X, Printer, Pencil, Trash2, Search } from "lucide-react";
import type { TeacherListFilters } from "@/lib/teacher-plan-display";

export type CourseworkRow = {
  id: string;
  topic: string;
  grade: string | null;
  date: Date | string | null;
  assignedAt: Date | string | null;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  groupSpeciality: string;
  disciplineId: string;
  disciplineName: string;
  semesterId: string;
  semesterNumber: number;
  semesterYear: string;
  course: number;
};

export function TeacherCourseworkView({
  rows,
  planSlots,
  students,
  initialFilters,
}: {
  rows: CourseworkRow[];
  planSlots: PlanSlot[];
  students: StudentRef[];
  initialFilters?: TeacherListFilters;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [discipline, setDiscipline] = useState(initialFilters?.discipline ?? "");
  const [semester, setSemester] = useState(initialFilters?.semester ?? "");
  const [studentId, setStudentId] = useState(initialFilters?.studentId ?? "");
  const [withGradeOnly, setWithGradeOnly] = useState<"" | "graded" | "topicOnly">("");

  const specialities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(),
    [rows]
  );
  const filteredAfterSpec = useMemo(
    () => (speciality ? rows.filter((r) => r.groupSpeciality === speciality) : rows),
    [rows, speciality]
  );
  const courses = useMemo(
    () => Array.from(new Set(filteredAfterSpec.map((r) => String(r.course)))).sort(),
    [filteredAfterSpec]
  );
  const filteredAfterCourse = useMemo(
    () => (course ? filteredAfterSpec.filter((r) => String(r.course) === course) : filteredAfterSpec),
    [filteredAfterSpec, course]
  );
  const groups = useMemo(
    () => Array.from(new Set(filteredAfterCourse.map((r) => r.groupName))).sort(),
    [filteredAfterCourse]
  );
  const filteredAfterGroup = useMemo(
    () => (groupName ? filteredAfterCourse.filter((r) => r.groupName === groupName) : filteredAfterCourse),
    [filteredAfterCourse, groupName]
  );
  const disciplines = useMemo(
    () => Array.from(new Set(filteredAfterGroup.map((r) => r.disciplineName))).sort(),
    [filteredAfterGroup]
  );
  const semesters = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.semesterNumber)))).sort(),
    [rows]
  );
  const studentOpts = useMemo(() => {
    const inFiltered = groupName ? students.filter((s) => filteredAfterGroup.find((r) => r.studentId === s.id)) : students;
    return inFiltered;
  }, [students, groupName, filteredAfterGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (speciality && r.groupSpeciality !== speciality) return false;
      if (course && String(r.course) !== course) return false;
      if (groupName && r.groupName !== groupName) return false;
      if (discipline && r.disciplineName !== discipline) return false;
      if (semester && String(r.semesterNumber) !== semester) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (withGradeOnly === "graded" && !r.grade) return false;
      if (withGradeOnly === "topicOnly" && r.grade) return false;
      if (q) {
        const blob = `${r.studentName} ${r.topic} ${r.disciplineName} ${r.groupName} ${r.grade ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, speciality, course, groupName, discipline, semester, studentId, withGradeOnly]);

  const hasFilters = !!(search || speciality || course || groupName || discipline || semester || studentId || withGradeOnly);
  const visible = !hasFilters ? filtered.slice(0, 10) : filtered;

  const reportUrl = `/print/coursework-report?${new URLSearchParams({
    speciality, course, group: groupName, discipline, semester, studentId, scope: withGradeOnly,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по студенту, теме, дисциплине, группе…"
          className="pl-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
            <Sel label="Специальность" value={speciality} onChange={(v) => { setSpeciality(v); setCourse(""); setGroupName(""); }} options={specialities} />
            <Sel label="Курс" value={course} onChange={(v) => { setCourse(v); setGroupName(""); }} options={courses} disabled={courses.length === 0} />
            <Sel label="Группа" value={groupName} onChange={(v) => { setGroupName(v); setStudentId(""); }} options={groups} disabled={groups.length === 0} />
            <Sel label="Дисциплина" value={discipline} onChange={setDiscipline} options={disciplines} />
            <Sel label="Семестр" value={semester} onChange={setSemester} options={semesters} />
            <Sel
              label="Студент"
              value={studentId}
              onChange={setStudentId}
              options={studentOpts.map((s) => s.fullName)}
              optionsLabels={Object.fromEntries(studentOpts.map((s) => [s.fullName, s.fullName]))}
              keyFn={(label) => studentOpts.find((s) => s.fullName === label)?.id ?? ""}
              labelFn={(id) => studentOpts.find((s) => s.id === id)?.fullName ?? ""}
            />
            <Sel
              label="Статус"
              value={withGradeOnly}
              onChange={(v) => setWithGradeOnly(v as "" | "graded" | "topicOnly")}
              options={["graded", "topicOnly"]}
              optionsLabels={{ graded: "С оценкой", topicOnly: "Только тема" }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {hasFilters
                ? <>Найдено: <span className="font-medium">{filtered.length}</span></>
                : <>Показаны последние <span className="font-medium">{visible.length}</span> из {rows.length}</>}
            </span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={reportUrl} target="_blank">
                  <Printer className="h-3 w-3 mr-1" />
                  Отчёт
                </Link>
              </Button>
              <CourseWorkQuickForm
                planSlots={planSlots}
                students={students}
                trigger={<Button size="sm"><Plus className="h-3 w-3 mr-1" />Добавить</Button>}
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSearch(""); setSpeciality(""); setCourse(""); setGroupName(""); setDiscipline("");
                  setSemester(""); setStudentId(""); setWithGradeOnly("");
                }}>
                  <X className="h-3 w-3 mr-1" />Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Студент</TableHead>
                <TableHead>Группа</TableHead>
                <TableHead>Семестр</TableHead>
                <TableHead>Дисциплина</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {hasFilters ? "По выбранным фильтрам ничего не найдено." : "Курсовых работ пока нет."}
                  </TableCell>
                </TableRow>
              ) : visible.map((r) => (
                <Row key={r.id} r={r} planSlots={planSlots} students={students} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  r, planSlots, students,
}: { r: CourseworkRow; planSlots: PlanSlot[]; students: StudentRef[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <TableRow>
      <TableCell>{r.studentName}</TableCell>
      <TableCell>{r.groupName}</TableCell>
      <TableCell className="whitespace-nowrap">{r.semesterNumber} сем. ({r.semesterYear})</TableCell>
      <TableCell>{r.disciplineName}</TableCell>
      <TableCell>{r.topic}</TableCell>
      <TableCell>
        {r.grade ? (
          <Badge variant={gradeIsPassing(r.grade) ? "success" : "destructive"}>{r.grade}</Badge>
        ) : (
          <Badge variant="outline">тема выдана</Badge>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {r.grade ? formatDate(r.date) : <span className="text-muted-foreground">выдана {formatDate(r.assignedAt)}</span>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <CourseWorkQuickForm
            planSlots={planSlots}
            students={students}
            initial={{
              id: r.id,
              semesterId: r.semesterId,
              disciplineId: r.disciplineId,
              groupId: r.groupId,
              studentId: r.studentId,
              topic: r.topic,
              grade: r.grade ?? "",
              date: r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
              assignedAt: r.assignedAt ? new Date(r.assignedAt).toISOString().slice(0, 10) : "",
            }}
            trigger={<Button variant="ghost" size="icon" title="Редактировать"><Pencil className="h-4 w-4" /></Button>}
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title="Удалить"
            onClick={() => {
              if (!confirm("Удалить эту курсовую?")) return;
              startTransition(async () => {
                try { await deleteCourseWork(r.id); }
                catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
              });
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function Sel<T extends string>({
  label, value, onChange, options, disabled, optionsLabels, keyFn, labelFn,
}: {
  label: string;
  value: T | "";
  onChange: (v: T | "") => void;
  options: readonly T[];
  disabled?: boolean;
  optionsLabels?: Record<string, string>;
  keyFn?: (label: T) => string;
  labelFn?: (id: string) => string;
}) {
  // когда у нас value хранит уже id, но options — labels → берём через keyFn
  const display = labelFn && value ? labelFn(value) : value;
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <select
        value={display}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange("");
          else if (keyFn) onChange(keyFn(v as T) as T);
          else onChange(v as T);
        }}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">— все —</option>
        {options.map((o) => <option key={o} value={o}>{optionsLabels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}
