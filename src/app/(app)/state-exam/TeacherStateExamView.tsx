"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { admissionLabel, formatDate, gradeIsPassing } from "@/lib/utils";
import { X, Printer, Search } from "lucide-react";
import type { TeacherListFilters } from "@/lib/teacher-plan-display";
import { filterGroupNamesByCourse, groupMatchesCourse, uniqueCoursesFromGroupNames } from "@/lib/group-course";

export type StateExamRow = {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  groupSpeciality: string;
  course: number;
  name: string;
  admission: string;
  admissionDate: Date | string | null;
  date: Date | string | null;
  grade: string | null;
  chairName: string | null;
};

export function TeacherStateExamView({
  rows,
  initialFilters,
}: {
  rows: StateExamRow[];
  initialFilters?: TeacherListFilters;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [studentId, setStudentId] = useState(initialFilters?.studentId ?? "");

  const specialities = useMemo(() => Array.from(new Set(rows.map((r) => r.groupSpeciality).filter(Boolean))).sort(), [rows]);
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
  const studentOpts = useMemo(() => {
    const seen = new Set<string>();
    const arr: { id: string; label: string }[] = [];
    for (const r of afterGroup) {
      if (seen.has(r.studentId)) continue;
      seen.add(r.studentId);
      arr.push({ id: r.studentId, label: r.studentName });
    }
    return arr;
  }, [afterGroup]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (speciality && r.groupSpeciality !== speciality) return false;
      if (course && !groupMatchesCourse(r.groupName, course)) return false;
      if (groupName && r.groupName !== groupName) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (q) {
        const blob = `${r.studentName} ${r.name} ${r.grade ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, speciality, course, groupName, studentId]);

  const hasFilters = !!(search || speciality || course || groupName || studentId);
  const visible = !hasFilters ? filtered.slice(0, 10) : filtered;

  const reportUrl = `/print/state-exam-report?${new URLSearchParams({
    speciality, course, group: groupName, studentId,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по студенту, экзамену…" className="pl-9" />
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
            <TableHeader><TableRow>
              <TableHead>Студент</TableHead>
              <TableHead>Группа</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Название экзамена</TableHead>
              <TableHead>Допуск</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Оценка</TableHead>
              <TableHead>Председатель ГЭК</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {hasFilters ? "По выбранным фильтрам ничего не найдено." : "Записей пока нет."}
                </TableCell></TableRow>
              ) : visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.groupName}</TableCell>
                  <TableCell>{r.course}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <Badge variant={r.admission === "ADMITTED" ? "success" : "destructive"}>{admissionLabel(r.admission)}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                  <TableCell>
                    {r.grade
                      ? <Badge variant={gradeIsPassing(r.grade) ? "success" : "destructive"}>{r.grade}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{r.chairName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
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
