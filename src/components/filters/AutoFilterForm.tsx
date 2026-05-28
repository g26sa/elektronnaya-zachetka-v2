"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, type FormEvent, type ReactNode } from "react";

/** При смене поля сбрасываем зависимые (каскад курс → группа → студент). */
const CLEAR_ON_CHANGE: Record<string, string[]> = {
  speciality: ["course", "group", "studentId", "student", "semester", "discipline"],
  course: ["group", "studentId", "student"],
  group: ["studentId", "student"],
  teacher: ["student"],
};

export function AutoFilterForm({
  action,
  hidden,
  className,
  children,
}: {
  action: string;
  hidden?: Record<string, string>;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const apply = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const p = new URLSearchParams();
    if (hidden) {
      for (const [k, v] of Object.entries(hidden)) {
        if (v) p.set(k, v);
      }
    }
    for (const [key, val] of fd.entries()) {
      const s = String(val).trim();
      if (s) p.set(key, s);
    }
    const qs = p.toString();
    router.push(qs ? `${action}?${qs}` : action);
  }, [action, hidden, router]);

  const handleChange = (e: FormEvent<HTMLFormElement>) => {
    const t = e.target;
    if (!(t instanceof HTMLSelectElement || t instanceof HTMLInputElement)) return;
    if (t instanceof HTMLInputElement && t.type === "text") return;

    const toClear = CLEAR_ON_CHANGE[t.name];
    if (toClear && formRef.current) {
      for (const name of toClear) {
        const el = formRef.current.elements.namedItem(name);
        if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) el.value = "";
      }
    }
    apply();
  };

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => e.preventDefault()}
      onChange={handleChange}
    >
      {children}
    </form>
  );
}
