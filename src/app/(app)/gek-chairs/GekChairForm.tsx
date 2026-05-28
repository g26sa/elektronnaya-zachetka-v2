"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveGekChair, deleteGekChair } from "./actions";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function GekChairForm({
  trigger, initial,
}: {
  trigger: React.ReactNode;
  initial?: { id: string; fullName: string; position: string | null; year: number | null; notes: string | null; isActive: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [year, setYear] = useState<string>(initial?.year ? String(initial.year) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await saveGekChair({
          id: initial?.id, fullName, position, year: year ? Number(year) : null, notes, isActive,
        });
        setOpen(false);
      } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Редактирование председателя" : "Новый председатель ГЭК"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ФИО</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Должность / звание</Label>
            <Input value={position ?? ""} onChange={(e) => setPosition(e.target.value)} placeholder="Профессор, доктор наук" />
          </div>
          <div className="space-y-1.5">
            <Label>Год начала</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Примечание (приказ и т.п.)</Label>
            <Input value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <Label htmlFor="active">Активен (показывать в выпадающем списке)</Label>
          </div>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "..." : "Сохранить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GekChairDeleteButton({ id, fullName }: { id: string; fullName: string }) {
  const [pending, startTransition] = useTransition();
  const [ask, ConfirmNode] = useConfirm();
  return (
    <>
      {ConfirmNode}
      <Button variant="ghost" size="icon" disabled={pending} onClick={async () => {
        if (!(await ask(`Удалить «${fullName}» из справочника?`))) return;
        startTransition(async () => {
          try { await deleteGekChair(id); }
          catch (e) { alert(e instanceof Error ? e.message : "Ошибка"); }
        });
      }}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </>
  );
}
