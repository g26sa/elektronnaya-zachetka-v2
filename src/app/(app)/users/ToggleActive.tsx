"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleUserActive } from "./actions";

export function ToggleActive({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={isActive ? "outline" : "secondary"} size="sm" disabled={pending}
      onClick={() => startTransition(async () => { await toggleUserActive(id); })}
    >
      {isActive ? "Отключить" : "Активировать"}
    </Button>
  );
}
