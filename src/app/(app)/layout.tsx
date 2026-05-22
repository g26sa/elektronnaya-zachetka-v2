import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationToasts } from "@/components/NotificationToasts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Загружаем непрочитанные уведомления (тост в левом нижнем углу)
  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar fullName={session.fullName} role={session.role} email={session.email} />
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
  );
}
