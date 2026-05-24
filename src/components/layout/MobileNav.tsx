"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/enums";
import { cn, roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/logout/actions";
import {
  Menu, X,
  LayoutDashboard, User, ClipboardList, BookOpen, Briefcase,
  GraduationCap, ScrollText, FileBadge, History, FileCog, Users, UsersRound, Building2,
  CalendarRange,
  LogOut,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType; roles: Role[] };

const ACADEMIC_ITEMS: Item[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/profile", label: "Профиль", icon: User, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/students", label: "Студенты", icon: Users, roles: ["TEACHER", "HEAD"] },
  { href: "/attestations", label: "Промежуточная аттестация", icon: ClipboardList, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/coursework", label: "Курсовые работы", icon: BookOpen, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/practice", label: "Практика", icon: Briefcase, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/gia", label: "ВКР", icon: GraduationCap, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/defense", label: "Защита ВКР", icon: ScrollText, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/state-exam", label: "Государственный экзамен", icon: FileBadge, roles: ["STUDENT", "TEACHER", "HEAD"] },
  { href: "/plan", label: "Планы преподавателей", icon: CalendarRange, roles: ["TEACHER", "HEAD"] },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/audit", label: "История изменений", icon: History, roles: ["HEAD"] },
  { href: "/groups", label: "Группы", icon: UsersRound, roles: ["HEAD"] },
  { href: "/vkr-types", label: "Виды ВКР", icon: ScrollText, roles: ["HEAD"] },
  { href: "/gek-chairs", label: "Председатели ГЭК", icon: FileBadge, roles: ["HEAD"] },
  { href: "/templates", label: "Шаблоны отчётов", icon: FileCog, roles: ["HEAD"] },
  { href: "/users", label: "Управление ролями", icon: Users, roles: ["HEAD"] },
  { href: "/institution", label: "Учреждение", icon: Building2, roles: ["HEAD"] },
];

export function MobileNav({
  role,
  fullName,
  email,
}: {
  role: Role;
  fullName: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const academicItems = ACADEMIC_ITEMS.filter((i) => i.roles.includes(role));
  const adminItems = ADMIN_ITEMS.filter((i) => i.roles.includes(role));

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Открыть меню"
        onClick={() => setOpen(true)}
        className="no-print"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity no-print",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-80 max-w-[90vw] bg-white border-l shadow-xl transition-transform duration-200 ease-out no-print flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Меню навигации"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: profile */}
        <div className="border-b p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{roleLabel(role)}</div>
                </div>
              </div>
              <div className="font-semibold leading-snug break-words">{fullName}</div>
              <div className="text-xs text-muted-foreground break-all">{email}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {academicItems.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors",
                  active && "bg-accent font-medium"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3">
                <div className="border-t" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3">
                  Администрирование
                </p>
              </div>
              {adminItems.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors",
                      active && "bg-accent font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer: logout */}
        <div className="border-t p-3">
          <form action={logoutAction}>
            <Button variant="outline" type="submit" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
