"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";

export type NotifItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date | string;
};

export function NotificationToasts({ initial }: { initial: NotifItem[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      try { await markNotificationRead(id); } catch {}
    });
  }
  function dismissAll() {
    setItems([]);
    startTransition(async () => {
      try { await markAllNotificationsRead(); } catch {}
    });
  }

  return (
    <div className="fixed left-4 bottom-4 z-40 w-80 space-y-2 no-print">
      {items.slice(0, 4).map((n) => (
        <div key={n.id} className="rounded-lg border bg-white shadow-lg p-3 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm leading-snug">{n.title}</div>
              {n.body && <div className="text-xs text-muted-foreground mt-0.5 break-words">{n.body}</div>}
              {n.link && (
                <Link
                  href={n.link}
                  className="text-xs text-primary hover:underline inline-block mt-1"
                  onClick={() => dismiss(n.id)}
                >
                  Открыть →
                </Link>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              disabled={pending}
              className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1"
              aria-label="Закрыть"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      {items.length > 1 && (
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={dismissAll} disabled={pending}>
          Отметить все прочитанными
        </Button>
      )}
    </div>
  );
}
