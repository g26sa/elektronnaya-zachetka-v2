"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  onConfirm,
  label = "Удалить",
  message = "Удалить запись?",
}: {
  onConfirm: () => Promise<unknown>;
  label?: string;
  message?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      disabled={pending}
      onClick={() => {
        if (!confirm(message)) return;
        startTransition(async () => {
          await onConfirm();
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
