import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfileForm } from "./StudentProfileForm";
import { ChevronLeft } from "lucide-react";
import { reactivateEndedAcademicLeaves } from "@/lib/student-academic-leave";

export default async function StudentProfileEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Только заведующий может править чужие профили целиком.
  await requireRole("HEAD");
  const { id } = await params;

  await reactivateEndedAcademicLeaves();

  const [student, groups] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: { user: true, group: true },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
          <ChevronLeft className="h-3 w-3" /> К списку
        </Link>
        <h1 className="text-2xl font-semibold">Редактирование профиля</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Данные студента</CardTitle></CardHeader>
        <CardContent>
          <StudentProfileForm
            key={student.id}
            studentId={student.id}
            groups={groups.map((g) => ({ id: g.id, label: `${g.name}${g.speciality ? " · " + g.speciality : ""}` }))}
            initial={{
              email: student.user.email,
              fullName: student.user.fullName,
              newPassword: "",
              isActive: student.user.isActive,
              recordBookNumber: student.recordBookNumber,
              groupId: student.groupId,
              birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : "",
              enrollmentDate: student.enrollmentDate.toISOString().slice(0, 10),
              enrollmentOrder: student.enrollmentOrder ?? "",
              expulsionDate: student.expulsionDate ? student.expulsionDate.toISOString().slice(0, 10) : "",
              expulsionOrder: student.expulsionOrder ?? "",
              academicLeaveDate: student.academicLeaveDate ? student.academicLeaveDate.toISOString().slice(0, 10) : "",
              academicLeaveEndDate: student.academicLeaveEndDate
                ? student.academicLeaveEndDate.toISOString().slice(0, 10)
                : "",
              academicLeaveOrder: student.academicLeaveOrder ?? "",
              currentCourse: student.currentCourse,
            }}
          />
        </CardContent>
      </Card>

    </div>
  );
}
