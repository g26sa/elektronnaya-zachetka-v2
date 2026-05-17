import { z } from "zod";

export const assessmentSchema = z.object({
  studentId: z.string().min(1, "Выберите студента"),
  semesterId: z.string().min(1, "Выберите семестр"),
  disciplineId: z.string().min(1, "Выберите дисциплину"),
  type: z.enum(["EXAM", "CREDIT", "GRADED_CREDIT"]),
  grade: z.string().min(1, "Введите оценку"),
  hours: z.coerce.number().int().nonnegative().optional().nullable(),
  creditUnits: z.coerce.number().nonnegative().optional().nullable(),
  date: z.string().min(1, "Введите дату"),
  teacherId: z.string().min(1, "Выберите преподавателя"),
  protocolNumber: z.string().optional().nullable(),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;
