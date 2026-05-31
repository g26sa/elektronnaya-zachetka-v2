"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveDisciplineType, deleteDisciplineType } from "./actions";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DisciplineTypeForm({
  trigger, initial,
}: {
  trigger: React.ReactNode;
  initial?: { id: string; name: string; isActive: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try { await saveDisciplineType({ id: initial?.id, name, isActive }); setOpen(false); }
      catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Редактирование вида" : "Новый вид дисциплины"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Обязательная дисциплина" />
          </div>
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <Label htmlFor="active">Активен</Label>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "..." : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DisciplineTypeDeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [ask, ConfirmNode] = useConfirm();
  return (
    <>
      {ConfirmNode}
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={async () => {
          if (!(await ask(`Удалить вид «${name}»?`))) return;
          startTransition(async () => {
            try { await deleteDisciplineType(id); }
            catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </>
  );
}
