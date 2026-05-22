import { z } from "zod";

/**
 * Курсовая работа: оценка и дата её выставления опциональны.
 * Препод может выдать тему сейчас, а оценку поставить позже.
 */
export const courseWorkSchema = z.object({
  studentId: z.string().min(1),
  semesterId: z.string().min(1),
  disciplineId: z.string().min(1),
  topic: z.string().min(1, "Введите тему"),
  grade: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable(),
  teacherId: z.string().min(1),
});
export type CourseWorkInput = z.infer<typeof courseWorkSchema>;
