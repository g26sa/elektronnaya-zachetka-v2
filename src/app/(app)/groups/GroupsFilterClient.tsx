"use client";
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

  function apply(spec: string, year: string, group: string) {
    const p = new URLSearchParams();
    if (spec) p.set("speciality", spec);
    if (year) p.set("year", year);
    if (group) p.set("group", group);
    router.push(`/groups?${p.toString()}`);
  }

  const hasFilters = initialSpeciality || initialYear || initialGroup;

  return (
    <form
      className="flex flex-wrap gap-4 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        apply(fd.get("speciality") as string, fd.get("year") as string, fd.get("group") as string);
      }}
    >
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Специальность</Label>
        <select
          name="speciality"
          defaultValue={initialSpeciality}
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
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все —</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Группа</Label>
        <Input name="group" defaultValue={initialGroup} placeholder="Поиск по названию" className="w-40" />
      </div>
      <Button type="submit" variant="outline" size="sm">Применить</Button>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => apply("", "", "")}>
          <X className="h-3 w-3 mr-1" />Сбросить
        </Button>
      )}
    </form>
  );
}
