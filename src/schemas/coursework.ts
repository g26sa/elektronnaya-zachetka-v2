import { z } from "zod";

export const courseWorkSchema = z.object({
  studentId: z.string().min(1),
  semesterId: z.string().min(1),
  disciplineId: z.string().min(1),
  topic: z.string().min(1, "Введите тему"),
  grade: z.string().min(1, "Введите оценку"),
  date: z.string().min(1),
  teacherId: z.string().min(1),
});
export type CourseWorkInput = z.infer<typeof courseWorkSchema>;
