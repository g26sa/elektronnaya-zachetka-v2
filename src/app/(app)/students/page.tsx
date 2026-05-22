import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentsExplorer } from "@/components/StudentsExplorer";
import { getTeacherStudentIds } from "@/lib/teacherPlan";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; speciality?: string; course?: string }>;
}) {
  const session = await requireRole("TEACHER", "HEAD");
  const params = await searchParams;

  // Преподаватель видит только привязанных к нему студентов (из плана)
  const allowedStudentIds = session.role === "TEACHER"
    ? await getTeacherStudentIds(session.userId)
    : null;

  const students = await prisma.student.findMany({
    where: allowedStudentIds ? { id: { in: allowedStudentIds } } : undefined,
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
    _count: s._count,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Студенты</h1>
      </div>
      <StudentsExplorer
        students={rows}
        canEditProfile={session.role === "HEAD"}
        initialGroup={params.group}
        initialSpeciality={params.speciality}
        initialCourse={params.course}
        defaultLimit={session.role === "TEACHER" ? 10 : undefined}
      />
    </div>
  );
}
