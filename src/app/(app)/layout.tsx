import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationToasts } from "@/components/NotificationToasts";
import { LogoProvider } from "@/lib/logo-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const [notifications, institution] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.institution.findFirst({ select: { logoUrl: true } }),
  ]);

  return (
    <LogoProvider initialLogoUrl={institution?.logoUrl}>
      <div className="min-h-screen flex flex-col bg-secondary/40">
        <TopBar
          fullName={session.fullName}
          role={session.role}
          email={session.email}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
        <NotificationToasts
          initial={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            link: n.link,
            createdAt: n.createdAt,
          }))}
        />
      </div>
    </LogoProvider>
  );
}
