"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PracticeGroupForm } from "./PracticeGroupForm";
import { PracticeStudentEditForm } from "./PracticeStudentEditForm";
import type { PracticePlanSlot, StudentRef } from "./practice-types";
import { deletePractice } from "./actions";
import { formatDate, gradeIsPassing, practiceKindLabel } from "@/lib/utils";
import { Plus, X, Printer, Pencil, Trash2, Search } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { TeacherListFilters } from "@/lib/teacher-plan-display";
import { filterGroupNamesByCourse, groupMatchesCourse, uniqueCoursesFromGroupNames } from "@/lib/group-course";

export type PracticeRow = {
  id: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  groupSpeciality: string;
  semesterId: string;
  semesterNumber: number;
  semesterYear: string;
  course: number;
  kind: string;
  place: string;
  startDate: Date | string;
  endDate: Date | string;
  grade: string | null;
  gradeDate: Date | string | null;
  orgSupervisorName: string | null;
  orgSupervisorPosition: string | null;
};

export function TeacherPracticeView({
  rows,
  planSlots,
  students,
  institutionName,
  initialFilters,
}: {
  rows: PracticeRow[];
  planSlots: PracticePlanSlot[];
  students: StudentRef[];
  institutionName: string;
  initialFilters?: TeacherListFilters;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [semester, setSemester] = useState(initialFilters?.semester ?? "");
  const [kind, setKind] = useState(initialFilters?.kind ?? "");
  const [studentId, setStudentId] = useState(initialFilters?.studentId ?? "");

  const specialities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(),
    [rows]
  );
  const afterSpec = useMemo(
    () => (speciality ? rows.filter((r) => r.groupSpeciality === speciality) : rows),
    [rows, speciality]
  );
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
  const afterGroup = useMemo(
    () => (groupName ? afterCourse.filter((r) => r.groupName === groupName) : afterCourse),
    [afterCourse, groupName]
  );
  const semesters = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.semesterNumber)))).sort(),
    [rows]
  );
  const studentOpts = useMemo(() => {
    const inFiltered = groupName ? students.filter((s) => afterGroup.find((r) => r.studentId === s.id)) : students;
    return inFiltered;
  }, [students, groupName, afterGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (speciality && r.groupSpeciality !== speciality) return false;
      if (course && !groupMatchesCourse(r.groupName, course)) return false;
      if (groupName && r.groupName !== groupName) return false;
      if (semester && String(r.semesterNumber) !== semester) return false;
      if (kind && r.kind !== kind) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (q) {
        const blob = `${r.studentName} ${r.place} ${r.groupName} ${practiceKindLabel(r.kind)} ${r.grade ?? ""} ${r.orgSupervisorName ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, speciality, course, groupName, semester, kind, studentId]);

  const hasFilters = !!(search || speciality || course || groupName || semester || kind || studentId);
  const visible = !hasFilters ? filtered.slice(0, 10) : filtered;

  const reportUrl = `/print/practice-report?${new URLSearchParams({
    speciality, course, group: groupName, semester, kind, studentId,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по студенту, месту, виду, руководителю…"
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
            <Sel label="Семестр" value={semester} onChange={setSemester} options={semesters} />
            <Sel
              label="Вид"
              value={kind}
              onChange={setKind}
              options={["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]}
              optionsLabels={{ EDUCATIONAL: "Учебная", PRODUCTION: "Производственная", PREDIPLOMA: "Преддипломная" }}
            />
            <Sel
              label="Студент"
              value={studentId}
              onChange={setStudentId}
              options={studentOpts.map((s) => s.id)}
              optionsLabels={Object.fromEntries(studentOpts.map((s) => [s.id, s.fullName]))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={reportUrl} target="_blank">
                  <Printer className="h-3 w-3 mr-1" />
                  Отчёт
                </Link>
              </Button>
              <PracticeGroupForm
                planSlots={planSlots}
                institutionName={institutionName}
                trigger={<Button size="sm"><Plus className="h-3 w-3 mr-1" />Добавить группу</Button>}
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSearch(""); setSpeciality(""); setCourse(""); setGroupName(""); setSemester(""); setKind(""); setStudentId("");
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
                <TableHead>Вид</TableHead>
                <TableHead>Место</TableHead>
                <TableHead>Период</TableHead>
                <TableHead>Оценка</TableHead>
                <TableHead>Рук. от организации</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {hasFilters
                      ? "По выбранным фильтрам записей нет. Нажмите «Добавить группу»."
                      : "Практик пока нет. Нажмите «Добавить группу» — записи создадутся для всех студентов."}
                  </TableCell>
                </TableRow>
              ) : visible.map((r) => (
                <Row key={r.id} r={r} institutionName={institutionName} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  r, institutionName,
}: { r: PracticeRow; institutionName: string }) {
  const [pending, startTransition] = useTransition();
  const [ask, ConfirmNode] = useConfirm();
  return (
    <TableRow>
      <TableCell>{r.studentName}</TableCell>
      <TableCell>{r.groupName}</TableCell>
      <TableCell className="whitespace-nowrap">{r.semesterNumber} сем. ({r.semesterYear})</TableCell>
      <TableCell>{practiceKindLabel(r.kind)}</TableCell>
      <TableCell className="max-w-[200px] truncate" title={r.place}>{r.place}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDate(r.startDate)} — {formatDate(r.endDate)}</TableCell>
      <TableCell>
        {r.grade
          ? <Badge variant={gradeIsPassing(r.grade) ? "success" : "destructive"}>{r.grade}</Badge>
          : <Badge variant="outline">не оценена</Badge>}
      </TableCell>
      <TableCell>
        {r.kind === "EDUCATIONAL" ? <span className="text-muted-foreground">—</span> : (r.orgSupervisorName ?? "—")}
      </TableCell>
      <TableCell className="text-right">
        {ConfirmNode}
        <div className="flex justify-end gap-1">
          <PracticeStudentEditForm
            studentName={r.studentName}
            kind={r.kind as "EDUCATIONAL" | "PRODUCTION" | "PREDIPLOMA"}
            initial={{
              id: r.id,
              grade: r.grade ?? "",
              gradeDate: r.gradeDate ? new Date(r.gradeDate).toISOString().slice(0, 10) : "",
              place: r.place,
              orgSupervisorName: r.orgSupervisorName ?? "",
              orgSupervisorPosition: r.orgSupervisorPosition ?? "",
            }}
            trigger={<Button variant="ghost" size="icon" title="Оценка и данные студента"><Pencil className="h-4 w-4" /></Button>}
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title="Удалить"
            onClick={async () => {
              if (!(await ask("Удалить эту практику?"))) return;
              startTransition(async () => {
                try { await deletePractice(r.id); }
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{optionsLabels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}
