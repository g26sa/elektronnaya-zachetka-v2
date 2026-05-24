import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentsExplorer } from "@/components/StudentsExplorer";
import { getTeacherStudentIds } from "@/lib/teacherPlan";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; speciality?: string; course?: string; tab?: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const params = await searchParams;
  const tab = params.tab === "archive" ? "archive" : "active";

  const allowedStudentIds = session.role === "TEACHER"
    ? await getTeacherStudentIds(session.userId)
    : null;

  const isArchived = tab === "archive";

  const students = await prisma.student.findMany({
    where: {
      ...(allowedStudentIds ? { id: { in: allowedStudentIds } } : {}),
      user: { isActive: !isArchived },
    },
    include: {
      user: { select: { fullName: true, email: true, isActive: true } },
      group: { select: { name: true, speciality: true } },
      _count: { select: { assessments: true, courseWorks: true, practices: true } },
    },
    orderBy: [{ group: { name: "asc" } }, { user: { fullName: "asc" } }],
  });

  const rows = students.map((s) => ({
    id: s.id,
    fullName: s.user.fullName,
    email: s.user.email,
    isActive: s.user.isActive,
    recordBookNumber: s.recordBookNumber,
    currentCourse: s.currentCourse,
    group: s.group,
    archiveReason: (s as { archiveReason?: string | null }).archiveReason ?? null,
    _count: s._count,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Студенты</h1>
      </div>

      {/* Вкладки активные / архив */}
      <div className="flex gap-2 border-b pb-0">
        <a
          href="/students?tab=active"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Активные
        </a>
        <a
          href="/students?tab=archive"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "archive"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Архив
        </a>
      </div>

      <StudentsExplorer
        students={rows}
        canEditProfile={session.role === "HEAD"}
        initialGroup={params.group}
        initialSpeciality={params.speciality}
        initialCourse={params.course}
        defaultLimit={10}
        isArchive={tab === "archive"}
      />
    </div>
  );
}
