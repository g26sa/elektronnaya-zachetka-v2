import { requireSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar fullName={session.fullName} role={session.role} email={session.email} />
      <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
    </div>
  );
}
