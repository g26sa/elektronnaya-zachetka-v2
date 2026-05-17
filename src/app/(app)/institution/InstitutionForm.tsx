"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveInstitution } from "./actions";
import type { Institution } from "@prisma/client";

export function InstitutionForm({ initial }: { initial?: Institution }) {
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [shortName, setShortName] = useState(initial?.shortName ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [ogrn, setOgrn] = useState(initial?.ogrn ?? "");
  const [inn, setInn] = useState(initial?.inn ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [headName, setHeadName] = useState(initial?.headName ?? "");
  const [headTitle, setHeadTitle] = useState(initial?.headTitle ?? "");

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await saveInstitution({ id: initial?.id, name, shortName, address, ogrn, inn, city, headName, headTitle });
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      } catch (e) { setErr(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Полное наименование"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Краткое наименование"><Input value={shortName ?? ""} onChange={(e) => setShortName(e.target.value)} /></Field>
      <Field label="Город"><Input value={city ?? ""} onChange={(e) => setCity(e.target.value)} /></Field>
      <Field label="Адрес"><Input value={address ?? ""} onChange={(e) => setAddress(e.target.value)} /></Field>
      <Field label="ОГРН"><Input value={ogrn ?? ""} onChange={(e) => setOgrn(e.target.value)} /></Field>
      <Field label="ИНН"><Input value={inn ?? ""} onChange={(e) => setInn(e.target.value)} /></Field>
      <Field label="Должность руководителя"><Input value={headTitle ?? ""} onChange={(e) => setHeadTitle(e.target.value)} /></Field>
      <Field label="ФИО руководителя"><Input value={headName ?? ""} onChange={(e) => setHeadName(e.target.value)} /></Field>
      {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
      {savedAt && <p className="sm:col-span-2 text-sm text-success">Сохранено в {savedAt}</p>}
      <div className="sm:col-span-2">
        <Button onClick={save} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
