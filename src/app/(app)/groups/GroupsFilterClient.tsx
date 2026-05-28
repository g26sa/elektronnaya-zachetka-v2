"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function GroupsFilterClient({
  initialSpeciality,
  initialYear,
  initialGroup,
  specialities,
  years,
}: {
  initialSpeciality: string;
  initialYear: string;
  initialGroup: string;
  specialities: string[];
  years: string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(spec: string, year: string, group: string) {
    const p = new URLSearchParams();
    if (spec) p.set("speciality", spec);
    if (year) p.set("year", year);
    if (group) p.set("group", group);
    const qs = p.toString();
    router.push(qs ? `/groups?${qs}` : "/groups");
  }

  function pushFromForm() {
    const fd = new FormData(formRef.current!);
    apply(
      String(fd.get("speciality") ?? ""),
      String(fd.get("year") ?? ""),
      String(fd.get("group") ?? "").trim()
    );
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hasFilters = initialSpeciality || initialYear || initialGroup;

  return (
    <form ref={formRef} className="flex flex-wrap gap-4 items-end" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Специальность</Label>
        <select
          name="speciality"
          defaultValue={initialSpeciality}
          onChange={pushFromForm}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm min-w-[200px]"
        >
          <option value="">— все —</option>
          {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Год набора</Label>
        <select
          name="year"
          defaultValue={initialYear}
          onChange={pushFromForm}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все —</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Группа</Label>
        <Input
          name="group"
          defaultValue={initialGroup}
          placeholder="Поиск по названию"
          className="w-40"
          onChange={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(pushFromForm, 400);
          }}
        />
      </div>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => apply("", "", "")}>
          <X className="h-3 w-3 mr-1" />Сбросить
        </Button>
      )}
    </form>
  );
}
