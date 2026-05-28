"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

/**
 * Программный хук — возвращает функцию `ask(message)` и элемент `<ConfirmNode />`.
 *
 * Использование:
 *   const [ask, ConfirmNode] = useConfirm();
 *   ...
 *   <>{ConfirmNode}<button onClick={async () => { if (await ask("Удалить?")) { ... } }} /></>
 */
export function useConfirm(): [
  (message: string, title?: string) => Promise<boolean>,
  React.ReactNode,
] {
  const [state, setState] = useState<{
    message: string;
    title: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const ask = (message: string, title = "Подтвердите действие") =>
    new Promise<boolean>((resolve) => {
      setState({ message, title, resolve });
    });

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const node = state ? (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
            {state.title}
          </DialogTitle>
          <DialogDescription className="pt-1 whitespace-pre-line">
            {state.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={() => handleClose(true)}>
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  return [ask, node];
}
