"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type StudentRow = {
  id: string;
  fullName: string;
  email: string;
  recordBookNumber: string;
  currentCourse: number;
  isActive: boolean;
  group: { name: string; speciality: string | null };
  _count: { assessments: number; courseWorks: number; practices: number };
};

type SortKey = "fullName" | "group" | "recordBookNumber" | "currentCourse";
type SortDir = "asc" | "desc";

export function StudentsExplorer({
  students,
  canEditProfile,
  initialGroup,
  initialSpeciality,
  initialCourse,
  defaultLimit,
}: {
  students: StudentRow[];
  canEditProfile: boolean;
  initialGroup?: string;
  initialSpeciality?: string;
  initialCourse?: string;
  /** Если задано — без фильтров показываем не больше N строк, ссылка «Показать все». */
  defaultLimit?: number;
}) {
  const [search, setSearch] = useState("");
  const [speciality, setSpeciality] = useState<string>(initialSpeciality ?? "");
  const [course, setCourse] = useState<string>(initialCourse ?? "");
  const [groupName, setGroupName] = useState<string>(initialGroup ?? "");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAll, setShowAll] = useState(false);

  // ─── Каскадные опции ──────────────────────────────────────────────────────
  const specialities = useMemo(
    () => Array.from(new Set(students.map((s) => s.group.speciality).filter(Boolean) as string[])).sort(),
    [students]
  );

  const studentsAfterSpec = useMemo(
    () => (speciality ? students.filter((s) => s.group.speciality === speciality) : students),
    [students, speciality]
  );

  const courses = useMemo(
    () => Array.from(new Set(studentsAfterSpec.map((s) => s.currentCourse))).sort((a, b) => a - b),
    [studentsAfterSpec]
  );

  const studentsAfterCourse = useMemo(
    () => (course ? studentsAfterSpec.filter((s) => String(s.currentCourse) === course) : studentsAfterSpec),
    [studentsAfterSpec, course]
  );

  const groups = useMemo(
    () => Array.from(new Set(studentsAfterCourse.map((s) => s.group.name))).sort(),
    [studentsAfterCourse]
  );

  // ─── Финальная фильтрация + поиск + сортировка ───────────────────────────
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = studentsAfterCourse;
    if (groupName) out = out.filter((s) => s.group.name === groupName);
    if (q) {
      out = out.filter((s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.recordBookNumber.toLowerCase().includes(q) ||
        s.group.name.toLowerCase().includes(q)
      );
    }
    const sorted = [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "fullName": cmp = a.fullName.localeCompare(b.fullName, "ru"); break;
        case "group": cmp = a.group.name.localeCompare(b.group.name, "ru"); break;
        case "recordBookNumber": cmp = a.recordBookNumber.localeCompare(b.recordBookNumber, "ru", { numeric: true }); break;
        case "currentCourse": cmp = a.currentCourse - b.currentCourse; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [studentsAfterCourse, groupName, search, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  function resetAll() {
    setSearch(""); setSpeciality(""); setCourse(""); setGroupName("");
  }

  const hasFilters = !!(search || speciality || course || groupName);
  const limitApplies = defaultLimit && !hasFilters && !showAll;
  const visibleRows = limitApplies ? rows.slice(0, defaultLimit) : rows;

  return (
    <div className="space-y-4">
      {/* Панель поиска и фильтров */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, email, № зачётной книжки или группе…"
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <FilterSelect
              label="Специальность"
              value={speciality}
              onChange={(v) => { setSpeciality(v); setCourse(""); setGroupName(""); }}
              options={specialities}
              placeholder="— все —"
            />
            <FilterSelect
              label="Курс"
              value={course}
              onChange={(v) => { setCourse(v); setGroupName(""); }}
              options={courses.map(String)}
              placeholder="— все —"
              disabled={courses.length === 0}
            />
            <FilterSelect
              label="Группа"
              value={groupName}
              onChange={setGroupName}
              options={groups}
              placeholder="— все —"
              disabled={groups.length === 0}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {limitApplies
                ? <>Показаны первые <span className="font-medium">{visibleRows.length}</span> из {rows.length}</>
                : <>Найдено: <span className="font-medium">{rows.length}</span> из {students.length}</>}
            </div>
            <div className="flex items-center gap-2">
              {limitApplies && rows.length > visibleRows.length && (
                <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                  Показать все ({rows.length})
                </Button>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={resetAll}>
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
                <SortableTh label="ФИО" k="fullName" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableTh label="Группа" k="group" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableTh label="№ зач. кн." k="recordBookNumber" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableTh label="Курс" k="currentCourse" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <TableHead className="text-right">Оценок / Курс. / Практик</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {hasFilters ? "Ничего не найдено по этим критериям." : "Студентов пока нет."}
                  </TableCell>
                </TableRow>
              ) : visibleRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.fullName}
                    {!s.isActive && <span className="ml-2 text-xs text-muted-foreground">(отключён)</span>}
                  </TableCell>
                  <TableCell>{s.group.name}</TableCell>
                  <TableCell>{s.recordBookNumber}</TableCell>
                  <TableCell>{s.currentCourse}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {s._count.assessments} / {s._count.courseWorks} / {s._count.practices}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" title="Открыть аттестации">
                        <Link href={`/attestations?studentId=${s.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {canEditProfile && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/students/${s.id}`}>Профиль</Link>
                        </Button>
                      )}
                    </div>
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

function FilterSelect({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
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
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        onClick={() => onClick(k)}
        className={
          "inline-flex items-center gap-1 -mx-1 px-1 rounded hover:bg-muted transition-colors " +
          (active ? "text-foreground font-semibold" : "text-foreground/80")
        }
      >
        {label}
        <Icon className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );
}
