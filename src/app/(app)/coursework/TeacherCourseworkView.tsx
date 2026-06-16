"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClipboardList, X, Printer } from "lucide-react";
import { filterGroupNamesByCourse, groupMatchesCourse, uniqueCoursesFromGroupNames } from "@/lib/group-course";
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

export type PlanSlot = {
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

export function TeacherCourseworkView({
  rows,
  planSlots,
  initialFilters,
}: {
  rows: CourseworkRow[];
  planSlots: PlanSlot[];
  students: StudentRef[];
  initialFilters?: TeacherListFilters;
}) {
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState(initialFilters?.group ?? "");
  const [discipline, setDiscipline] = useState(initialFilters?.discipline ?? "");
  const [semester, setSemester] = useState(initialFilters?.semester ?? "");

  const specialities = useMemo(
    () => Array.from(new Set(planSlots.map((s) => s.groupSpeciality).filter(Boolean))).sort(),
    [planSlots]
  );
  const afterSpec = useMemo(
    () => (speciality ? planSlots.filter((s) => s.groupSpeciality === speciality) : planSlots),
    [planSlots, speciality]
  );
  const courses = useMemo(
    () => uniqueCoursesFromGroupNames(afterSpec.map((s) => s.groupName)),
    [afterSpec]
  );
  const groups = useMemo(
    () => filterGroupNamesByCourse(afterSpec.map((s) => s.groupName), course),
    [afterSpec, course]
  );
  const disciplines = useMemo(
    () => Array.from(new Set(planSlots.map((s) => s.disciplineName))).sort((a, b) => a.localeCompare(b, "ru")),
    [planSlots]
  );
  const semesters = useMemo(
    () => Array.from(new Set(planSlots.map((s) => String(s.semesterNumber)))).sort(),
    [planSlots]
  );

  const filtered = useMemo(() => planSlots.filter((s) => {
    if (speciality && s.groupSpeciality !== speciality) return false;
    if (course && !groupMatchesCourse(s.groupName, course)) return false;
    if (groupName && s.groupName !== groupName) return false;
    if (discipline && s.disciplineName !== discipline) return false;
    if (semester && String(s.semesterNumber) !== semester) return false;
    return true;
  }), [planSlots, speciality, course, groupName, discipline, semester]);

  // Количество оценок/тем по каждому слоту плана
  const statsBySlot = useMemo(() => {
    const map = new Map<string, { graded: number; topicOnly: number }>();
    for (const slot of planSlots) {
      const slotRows = rows.filter(
        (r) => r.groupId === slot.groupId &&
               r.disciplineId === slot.disciplineId &&
               r.semesterId === slot.semesterId
      );
      map.set(slot.id, {
        graded: slotRows.filter((r) => r.grade).length,
        topicOnly: slotRows.filter((r) => !r.grade).length,
      });
    }
    return map;
  }, [planSlots, rows]);

  const hasFilters = !!(speciality || course || groupName || discipline || semester);
  const printUrl = `/print/coursework-report?${new URLSearchParams({ speciality, course, group: groupName, discipline, semester } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Sel label="Специальность" value={speciality} onChange={(v) => { setSpeciality(v); setCourse(""); setGroupName(""); }} options={specialities} />
            <Sel label="Курс" value={course} onChange={(v) => { setCourse(v); setGroupName(""); }} options={courses.map(String)} disabled={courses.length === 0} />
            <Sel label="Группа" value={groupName} onChange={setGroupName} options={groups} disabled={!course || groups.length === 0} emptyLabel={course ? "— все —" : "Сначала курс"} />
            <Sel label="Семестр" value={semester} onChange={setSemester} options={semesters} />
            <Sel label="Дисциплина" value={discipline} onChange={setDiscipline} options={disciplines} />
          </div>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={printUrl} target="_blank">
                <Printer className="h-3 w-3 mr-1" />Отчёт
              </Link>
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSpeciality(""); setCourse(""); setGroupName(""); setDiscipline(""); setSemester(""); }}>
                <X className="h-3 w-3 mr-1" />Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-2">
            <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
            <p>{hasFilters ? "По выбранным фильтрам дисциплин нет." : "В вашем плане ещё нет курсовых работ."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((slot) => {
            const stats = statsBySlot.get(slot.id);
            return (
              <Link
                key={slot.id}
                href={`/coursework/${slot.id}`}
                className="group block rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
              >
                <div className="font-semibold mb-1 group-hover:underline">{slot.disciplineName}</div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <div>Группа <b className="text-foreground">{slot.groupName}</b></div>
                  <div>{slot.semesterNumber} семестр · {slot.semesterYear} уч. г.</div>
                  {slot.groupSpeciality && <div className="text-xs truncate">{slot.groupSpeciality}</div>}
                  {stats && (stats.graded > 0 || stats.topicOnly > 0) && (
                    <div className="text-xs pt-1 flex gap-2">
                      {stats.graded > 0 && <span className="text-green-600">✓ {stats.graded} с оценкой</span>}
                      {stats.topicOnly > 0 && <span className="text-amber-600">· {stats.topicOnly} тема выдана</span>}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sel({
  label, value, onChange, options, disabled, emptyLabel = "— все —",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
