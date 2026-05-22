import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentProfileForm } from "./StudentProfileForm";
import { DeleteStudentButton } from "./DeleteStudentButton";
import { ChevronLeft } from "lucide-react";

export default async function StudentProfileEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Только заведующий может править чужие профили целиком.
  await requireRole("HEAD");
  const { id } = await params;

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
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <ChevronLeft className="h-3 w-3" /> К списку
          </Link>
          <h1 className="text-2xl font-semibold">Редактирование профиля</h1>
          <p className="text-muted-foreground text-sm">
            {student.user.fullName} · группа {student.group.name} · № {student.recordBookNumber}
          </p>
        </div>
        <DeleteStudentButton studentId={student.id} studentName={student.user.fullName} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Данные студента</CardTitle></CardHeader>
        <CardContent>
          <StudentProfileForm
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
              currentCourse: student.currentCourse,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Связанные разделы</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/attestations?studentId=${student.id}`}>Аттестации</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/coursework?studentId=${student.id}`}>Курсовые</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/practice?studentId=${student.id}`}>Практика</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/gia?studentId=${student.id}`}>ВКР</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/defense?studentId=${student.id}`}>Защита</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/state-exam?studentId=${student.id}`}>Гос. экзамен</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
