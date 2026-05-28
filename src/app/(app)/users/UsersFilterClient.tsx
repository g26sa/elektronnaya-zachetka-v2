"use client";
import { useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

  function apply(role: string, status: string) {
    const p = new URLSearchParams();
    if (role) p.set("role", role);
    if (status) p.set("status", status);
    const qs = p.toString();
    router.push(qs ? `/users?${qs}` : "/users");
  }

  function pushFromForm() {
    const fd = new FormData(formRef.current!);
    apply(String(fd.get("role") ?? ""), String(fd.get("status") ?? ""));
  }

  const hasFilters = initialRole || initialStatus;

  return (
    <form ref={formRef} className="flex flex-wrap gap-4 items-end" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Роль</Label>
        <select
          name="role"
          defaultValue={initialRole}
          onChange={pushFromForm}
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
          onChange={pushFromForm}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        >
          <option value="">— все —</option>
          <option value="active">Активен</option>
          <option value="inactive">Отключён</option>
        </select>
      </div>
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
