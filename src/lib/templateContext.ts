import { prisma } from "@/lib/db";
import { assessmentTypeLabel, formatDate, formatDateLong, practiceKindLabel, admissionLabel } from "@/lib/utils";

/**
 * Собирает плоский контекст для движка шаблонов по студенту.
 * Структура отражает структуру зачётной книжки.
 */
export async function buildStudentContext(studentId: string) {
  const [institution, student] = await Promise.all([
    prisma.institution.findFirst(),
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        group: true,
        assessments: { include: { discipline: true, semester: true, teacher: true }, orderBy: [{ semester: { academicYear: "asc" } }, { semester: { number: "asc" } }, { date: "asc" }] },
        courseWorks: { include: { discipline: true, semester: true, teacher: true }, orderBy: { date: "asc" } },
        practices: { include: { semester: true, instSupervisor: true }, orderBy: { startDate: "asc" } },
        vkr: { include: { supervisor: true, defense: { include: { chair: true } } } },
        stateExams: { include: { chair: true }, orderBy: { date: "asc" } },
      },
    }),
  ]);

  if (!student) throw new Error("Студент не найден");

  return {
    institution: institution
      ? {
          name: institution.name,
          shortName: institution.shortName,
          address: institution.address,
          ogrn: institution.ogrn,
          inn: institution.inn,
          headName: institution.headName,
          headTitle: institution.headTitle,
          city: institution.city,
        }
      : null,
    today: formatDateLong(new Date()),
    student: {
      fullName: student.user.fullName,
      email: student.user.email,
      birthDate: formatDate(student.birthDate),
      group: student.group.name,
      speciality: student.group.speciality,
      recordBookNumber: student.recordBookNumber,
      enrollmentDate: formatDate(student.enrollmentDate),
      enrollmentOrder: student.enrollmentOrder,
      currentCourse: student.currentCourse,
    },
    assessments: student.assessments.map((a) => ({
      semester: `${a.semester.academicYear}, ${a.semester.course} к., ${a.semester.number} сем.`,
      discipline: a.discipline.name,
      hours: a.hours ?? "",
      creditUnits: a.creditUnits ?? "",
      type: assessmentTypeLabel(a.type),
      grade: a.grade,
      date: formatDate(a.date),
      teacher: a.teacher.fullName,
    })),
    courseWorks: student.courseWorks.map((c) => ({
      semester: `${c.semester.academicYear}, ${c.semester.course} к., ${c.semester.number} сем.`,
      discipline: c.discipline.name,
      topic: c.topic,
      grade: c.grade,
      date: formatDate(c.date),
      teacher: c.teacher.fullName,
    })),
    practices: student.practices.map((p) => ({
      course: p.course,
      semester: `${p.semester.academicYear}, ${p.semester.number} сем.`,
      kind: practiceKindLabel(p.kind),
      place: p.place,
      hours: p.hours ?? "",
      creditUnits: p.creditUnits ?? "",
      grade: p.grade,
      gradeDate: formatDate(p.gradeDate),
      startDate: formatDate(p.startDate),
      endDate: formatDate(p.endDate),
      instSupervisor: p.instSupervisor.fullName,
      orgSupervisor: p.orgSupervisorName ?? "",
      orgSupervisorPosition: p.orgSupervisorPosition ?? "",
    })),
    vkr: student.vkr
      ? {
          topic: student.vkr.topic,
          type: student.vkr.type ?? "",
          approvedOrder: student.vkr.approvedOrder ?? "",
          approvedDate: formatDate(student.vkr.approvedDate),
          supervisor: student.vkr.supervisor.fullName,
          defense: student.vkr.defense
            ? {
                admission: admissionLabel(student.vkr.defense.admission),
                admissionDate: formatDate(student.vkr.defense.admissionDate),
                date: formatDate(student.vkr.defense.date),
                grade: student.vkr.defense.grade ?? "",
                chair: student.vkr.defense.chair?.fullName ?? "",
                protocolNumber: student.vkr.defense.protocolNumber ?? "",
              }
            : null,
        }
      : null,
    stateExams: student.stateExams.map((e) => ({
      name: e.name,
      admission: admissionLabel(e.admission),
      admissionDate: formatDate(e.admissionDate),
      date: formatDate(e.date),
      grade: e.grade ?? "",
      chair: e.chair?.fullName ?? "",
      protocolNumber: e.protocolNumber ?? "",
    })),
  };
}

export type StudentTemplateContext = Awaited<ReturnType<typeof buildStudentContext>>;
