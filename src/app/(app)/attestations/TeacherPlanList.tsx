"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClipboardList, X, Printer } from "lucide-react";

export type PlanCardItem = {
  id: string;
  discipline: string;
  groupName: string;
  speciality: string;
  course: number;
  semesterNumber: number;
  academicYear: string;
  hours: number | null;
};

export function TeacherPlanList({ items }: { items: PlanCardItem[] }) {
  const [speciality, setSpeciality] = useState("");
  const [course, setCourse] = useState("");
  const [groupName, setGroupName] = useState("");
  const [semester, setSemester] = useState("");
  const [discipline, setDiscipline] = useState("");

  const specialities = useMemo(
    () => Array.from(new Set(items.map((i) => i.speciality).filter(Boolean))).sort(),
    [items]
  );
  const afterSpec = useMemo(
    () => (speciality ? items.filter((i) => i.speciality === speciality) : items),
    [items, speciality]
  );
  const courses = useMemo(
    () => Array.from(new Set(afterSpec.map((i) => String(i.course)))).sort(),
    [afterSpec]
  );
  const afterCourse = useMemo(
    () => (course ? afterSpec.filter((i) => String(i.course) === course) : afterSpec),
    [afterSpec, course]
  );
  const groups = useMemo(
    () => Array.from(new Set(afterCourse.map((i) => i.groupName))).sort(),
    [afterCourse]
  );
  const semesters = useMemo(
    () => Array.from(new Set(items.map((i) => String(i.semesterNumber)))).sort(),
    [items]
  );
  const disciplines = useMemo(
    () => Array.from(new Set(items.map((i) => i.discipline))).sort((a, b) => a.localeCompare(b, "ru")),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (speciality && i.speciality !== speciality) return false;
      if (course && String(i.course) !== course) return false;
      if (groupName && i.groupName !== groupName) return false;
      if (semester && String(i.semesterNumber) !== semester) return false;
      if (discipline && i.discipline !== discipline) return false;
      return true;
    });
  }, [items, speciality, course, groupName, semester, discipline]);

  const hasFilters = !!(speciality || course || groupName || semester || discipline);
  const printUrl = `/print/teacher-plan?${new URLSearchParams({
    speciality, course, group: groupName, semester, discipline,
  } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Sel
              label="Специальность"
              value={speciality}
              onChange={(v) => { setSpeciality(v); setCourse(""); setGroupName(""); }}
              options={specialities}
            />
            <Sel
              label="Курс"
              value={course}
              onChange={(v) => { setCourse(v); setGroupName(""); }}
              options={courses}
              disabled={courses.length === 0}
            />
            <Sel
              label="Группа"
              value={groupName}
              onChange={setGroupName}
              options={groups}
              disabled={groups.length === 0}
            />
            <Sel
              label="Семестр"
              value={semester}
              onChange={setSemester}
              options={semesters}
            />
            <Sel
              label="Дисциплина"
              value={discipline}
              onChange={setDiscipline}
              options={disciplines}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Дисциплин: <span className="font-medium">{filtered.length}</span> из {items.length}
            </span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={printUrl} target="_blank">
                  <Printer className="h-3 w-3 mr-1" />
                  Отчёт по плану
                </Link>
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSpeciality(""); setCourse(""); setGroupName(""); setSemester(""); setDiscipline(""); }}>
                  <X className="h-3 w-3 mr-1" />Сбросить
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground space-y-2">
          <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
          <p>{hasFilters ? "По выбранным фильтрам дисциплин нет." : "В вашем плане ещё нет дисциплин по промежуточной аттестации."}</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((it) => (
            <Link
              key={it.id}
              href={`/attestations/${it.id}`}
              className="group block rounded-lg border bg-card p-4 hover:bg-accent transition-colors"
            >
              <div className="font-semibold mb-1 group-hover:underline">{it.discipline}</div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div>Группа <b className="text-foreground">{it.groupName}</b></div>
                <div>{it.semesterNumber} семестр · {it.academicYear} уч. г.</div>
                {it.hours != null && it.hours > 0 && <div>{it.hours} часов</div>}
                {it.speciality && <div className="text-xs truncate">{it.speciality}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Sel({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
