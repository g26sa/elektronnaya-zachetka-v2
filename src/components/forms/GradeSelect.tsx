"use client";
import { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { controlledSelectProps } from "./controlled-select";

/**
 * Выпадающий список оценок. Унифицирован для всех форм.
 * Поддерживает «зачётные» (зачтено/не зачтено) и численные.
 */
const NUMERIC_GRADES = ["5", "4", "3", "2"];
const PASS_GRADES = ["зачтено", "не зачтено"];

export const GradeSelect = forwardRef<HTMLSelectElement, {
  label?: string;
  err?: string;
  className?: string;
  /** Если true — добавляем «зачтено/не зачтено» */
  includePass?: boolean;
  /** Если true — только «зачтено/не зачтено» (для CREDIT) */
  passOnly?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>>(function GradeSelect(
  { label = "Оценка", err, className, includePass = true, passOnly = false, value, ...rest }, ref
) {
  const options = passOnly
    ? PASS_GRADES
    : [...NUMERIC_GRADES, ...(includePass ? PASS_GRADES : [])];
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      <select
        ref={ref}
        {...controlledSelectProps({ ...rest, value })}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
      >
        <option value="">— выберите —</option>
        {options.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
});
