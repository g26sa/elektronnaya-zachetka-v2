"use client";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function UsersFilterClient({
  initialRole,
  initialStatus,
}: {
  initialRole: string;
  initialStatus: string;
}) {
  const router = useRouter();

  function apply(role: string, status: string) {
    const p = new URLSearchParams();
    if (role) p.set("role", role);
    if (status) p.set("status", status);
    router.push(`/users?${p.toString()}`);
  }

  const hasFilters = initialRole || initialStatus;

  return (
    <form
      className="flex flex-wrap gap-4 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        apply(fd.get("role") as string, fd.get("status") as string);
      }}
    >
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Роль</Label>
        <select
          name="role"
          defaultValue={initialRole}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все —</option>
          <option value="TEACHER">Преподаватель</option>
          <option value="HEAD">Заведующий отделением</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Статус</Label>
        <select
          name="status"
          defaultValue={initialStatus}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все —</option>
          <option value="active">Активен</option>
          <option value="inactive">Отключён</option>
        </select>
      </div>
      <Button type="submit" variant="outline" size="sm">Применить</Button>
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => apply("", "")}
        >
          <X className="h-3 w-3 mr-1" />Сбросить
        </Button>
      )}
    </form>
  );
}
