"use client";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveInstitution, deleteLogo } from "./actions";
import type { Institution } from "@prisma/client";
import { Upload, Trash2 } from "lucide-react";
import { useLogo } from "@/lib/logo-context";
import { logoDisplaySrc, logoCacheKeyFromUrl } from "@/lib/institution-logo-display";

export function InstitutionForm({ initial }: { initial?: Institution }) {
  const router = useRouter();
  const { setLogo } = useLogo();
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
  const [departmentName, setDepartmentName] = useState(initial?.departmentName ?? "");
  const [departmentHeadName, setDepartmentHeadName] = useState(initial?.departmentHeadName ?? "");
  const [departmentHeadTitle, setDepartmentHeadTitle] = useState(
    initial?.departmentHeadTitle ?? "Заведующий отделением"
  );
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [logoCacheKey, setLogoCacheKey] = useState(() => logoCacheKeyFromUrl(initial?.logoUrl));
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setErr(null);
    setLogoLoadError(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = (await res.json()) as { logoUrl?: string; cacheKey?: number; error?: string };
      if (!res.ok || !json.logoUrl) {
        throw new Error(json.error ?? "Ошибка загрузки");
      }
      const cacheKey = json.cacheKey ?? logoCacheKeyFromUrl(json.logoUrl);
      setLogoUrl(json.logoUrl);
      setLogoCacheKey(cacheKey);
      setLogo(json.logoUrl, cacheKey);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки логотипа");
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    setErr(null);
    setLogoLoadError(false);
    try {
      await deleteLogo();
      setLogoUrl("");
      setLogoCacheKey(0);
      setLogo(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось удалить логотип");
    }
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await saveInstitution({
          id: initial?.id,
          name,
          shortName,
          address,
          ogrn,
          inn,
          city,
          headName,
          headTitle,
          departmentName,
          departmentHeadName,
          departmentHeadTitle,
        });
        setSavedAt(new Date().toLocaleTimeString("ru-RU"));
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  const previewSrc = logoUrl ? logoDisplaySrc(logoUrl, logoCacheKey) : "";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Логотип учреждения
        </h3>
        <div className="flex items-center gap-4">
          {logoUrl && !logoLoadError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${logoUrl}-${logoCacheKey}`}
              src={previewSrc}
              alt="Логотип"
              className="h-16 w-16 object-contain rounded border shrink-0 bg-white"
              onError={() => setLogoLoadError(true)}
            />
          ) : (
            <div className="h-16 w-16 rounded border bg-muted shrink-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground text-center px-1">
                {logoLoadError ? (
                  <>Не удалось<br />показать</>
                ) : (
                  <>
                    Нет
                    <br />
                    логотипа
                  </>
                )}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/x-icon,.png,.jpg,.jpeg,.svg,.webp,.ico"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadLogo(f);
              }}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoUploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoUploading ? "Загрузка…" : "Загрузить логотип"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="outline" size="sm" disabled={logoUploading} onClick={() => void removeLogo()}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WEBP, ICO</p>
            {logoLoadError && logoUrl && (
              <p className="text-xs text-destructive">
                Файл в базе есть, но не открывается. Загрузите логотип ещё раз.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Учреждение в целом</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Полное наименование"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Краткое наименование"><Input value={shortName ?? ""} onChange={(e) => setShortName(e.target.value)} /></Field>
          <Field label="Город"><Input value={city ?? ""} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="Адрес"><Input value={address ?? ""} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="ОГРН"><Input value={ogrn ?? ""} onChange={(e) => setOgrn(e.target.value)} /></Field>
          <Field label="ИНН"><Input value={inn ?? ""} onChange={(e) => setInn(e.target.value)} /></Field>
          <Field label="Должность руководителя"><Input value={headTitle ?? ""} onChange={(e) => setHeadTitle(e.target.value)} placeholder="Директор" /></Field>
          <Field label="ФИО руководителя"><Input value={headName ?? ""} onChange={(e) => setHeadName(e.target.value)} /></Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Отделение (учебная часть)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Название отделения"><Input value={departmentName ?? ""} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Отделение информационных технологий" /></Field>
          <Field label="Должность"><Input value={departmentHeadTitle ?? ""} onChange={(e) => setDepartmentHeadTitle(e.target.value)} placeholder="Заведующий отделением" /></Field>
          <Field label="ФИО заведующего отделением" className="sm:col-span-2"><Input value={departmentHeadName ?? ""} onChange={(e) => setDepartmentHeadName(e.target.value)} placeholder="Иванова И. И." /></Field>
        </div>
      </section>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {savedAt && <p className="text-sm text-success">Сохранено в {savedAt}</p>}
      <Button onClick={save} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + (className ?? "")}><Label>{label}</Label>{children}</div>;
}
