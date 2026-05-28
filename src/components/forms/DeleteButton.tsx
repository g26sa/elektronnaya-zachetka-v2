"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  const [ask, ConfirmNode] = useConfirm();

  return (
    <>
      {ConfirmNode}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={label}
        disabled={pending}
        onClick={async () => {
          if (!(await ask(message))) return;
          startTransition(async () => { await onConfirm(); });
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </>
  );
}
