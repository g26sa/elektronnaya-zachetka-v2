"use client";
import type { Role } from "@/types/enums";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { GraduationCap } from "lucide-react";
import { useLogo } from "@/lib/logo-context";
import { logoDisplaySrc } from "@/lib/institution-logo-display";

export function TopBar({
  fullName,
  role,
  email,
}: {
  fullName: string;
  role: Role;
  email: string;
}) {
  const { logoUrl, logoCacheKey } = useLogo();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 sm:px-6 no-print">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${logoUrl}-${logoCacheKey}`}
            src={logoDisplaySrc(logoUrl, logoCacheKey)}
            alt="Логотип"
            className="h-8 w-8 object-contain rounded shrink-0"
          />
        ) : (
          <span className="grid place-items-center h-8 w-8 rounded bg-primary text-primary-foreground shrink-0">
            <GraduationCap className="h-4 w-4" />
          </span>
        )}
        <span className="hidden sm:inline">Электронная зачётная книжка</span>
      </Link>
      <MobileNav role={role} fullName={fullName} email={email} />
    </header>
  );
}
