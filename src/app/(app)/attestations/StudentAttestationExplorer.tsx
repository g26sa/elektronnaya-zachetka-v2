"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { RecordBookPage, type RecordBookSemester } from "@/components/documents/RecordBookPage";
import { assessmentTypeLabel } from "@/lib/utils";

type RawAssessment = {
  id: string;
  discipline: { name: string };
  hours: number | null;
  creditUnits: number | null;
  type: string;
  grade: string;
  date: Date | string;
  teacher: { fullName: string };
  semester: { id: string; course: number; number: number; academicYear: string };
};

export function StudentAttestationExplorer({
  studentName,
  group,
  recordBookNumber,
  assessments,
}: {
  studentName: string;
  group: string;
  recordBookNumber: string;
  assessments: RawAssessment[];
}) {
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Нормализация дат
  const norm = useMemo(
    () =>
      assessments.map((a) => ({
        ...a,
        date: typeof a.date === "string" ? new Date(a.date) : a.date,
      })),
    [assessments]
  );

  // Опции из реальных данных
  const courses = useMemo(
    () => Array.from(new Set(norm.map((a) => a.semester.course))).sort((a, b) => a - b),
    [norm]
  );
  const semestersAfterCourse = useMemo(
    () => (course ? norm.filter((a) => String(a.semester.course) === course) : norm),
    [norm, course]
  );
  const semesterLabels = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const a of semestersAfterCourse) {
      const v = a.semester.id;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push({
        value: v,
        label: `${a.semester.academicYear}, ${a.semester.course} к., ${a.semester.number} сем.`,
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [semestersAfterCourse]);

  const disciplines = useMemo(
    () => Array.from(new Set(norm.map((a) => a.discipline.name))).sort((a, b) => a.localeCompare(b, "ru")),
    [norm]
  );
  const types = useMemo(
    () => Array.from(new Set(norm.map((a) => a.type))),
    [norm]
  );

  // Фильтрация
  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;
    return norm.filter((a) => {
      if (course && String(a.semester.course) !== course) return false;
      if (semester && a.semester.id !== semester) return false;
      if (discipline && a.discipline.name !== discipline) return false;
      if (type && a.type !== type) return false;
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      return true;
    });
  }, [norm, course, semester, discipline, type, fromDate, toDate]);

  // Группировка по семестрам в хронологическом порядке
  const grouped: RecordBookSemester[] = useMemo(() => {
    const map = new Map<string, RecordBookSemester>();
    for (const a of filtered) {
      if (!map.has(a.semester.id)) {
        map.set(a.semester.id, {
          id: a.semester.id,
          course: a.semester.course,
          number: a.semester.number,
          academicYear: a.semester.academicYear,
          assessments: [],
        });
      }
      map.get(a.semester.id)!.assessments.push({
        id: a.id,
        discipline: a.discipline,
        hours: a.hours,
        creditUnits: a.creditUnits,
        type: a.type,
        grade: a.grade,
        date: a.date as Date,
        teacher: a.teacher,
      });
    }
    return Array.from(map.values()).sort((x, y) => {
      if (x.academicYear !== y.academicYear) return x.academicYear.localeCompare(y.academicYear);
      if (x.course !== y.course) return x.course - y.course;
      return x.number - y.number;
    });
  }, [filtered]);

  const hasActive = course || semester || discipline || type || fromDate || toDate;
  function reset() {
    setCourse(""); setSemester(""); setDiscipline(""); setType(""); setFromDate(""); setToDate("");
  }

  return (
    <div className="space-y-4">
      <Card className="no-print">
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <FilterSelect
              label="Курс"
              value={course}
              onChange={(v) => { setCourse(v); setSemester(""); }}
              options={courses.map(String)}
            />
            <FilterSelect
              label="Семестр"
              value={semester}
              onChange={setSemester}
              options={semesterLabels.map((s) => s.value)}
              optionLabels={Object.fromEntries(semesterLabels.map((s) => [s.value, s.label]))}
              disabled={semesterLabels.length === 0}
            />
            <FilterSelect
              label="Дисциплина"
              value={discipline}
              onChange={setDiscipline}
              options={disciplines}
            />
            <FilterSelect
              label="Форма контроля"
              value={type}
              onChange={setType}
              options={types}
              optionLabels={Object.fromEntries(types.map((t) => [t, assessmentTypeLabel(t)]))}
            />
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Дата</Label>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-xs"
                  title="с"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-xs"
                  title="по"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Записей: <span className="font-medium">{filtered.length}</span> из {norm.length}
              {grouped.length > 0 && ` · семестров: ${grouped.length}`}
            </span>
            {hasActive && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-3 w-3 mr-1" />Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          По выбранным фильтрам записей нет.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((sem, i) => (
            <div key={sem.id} className="printable-page">
              <RecordBookPage
                studentName={studentName}
                group={group}
                recordBookNumber={recordBookNumber}
                semester={sem}
                showHeader={i === 0}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options, optionLabels, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
  disabled?: boolean;
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
        <option value="">— все —</option>
        {options.map((o) => <option key={o} value={o}>{optionLabels?.[o] ?? o}</option>)}
      </select>
    </div>
  );
}
