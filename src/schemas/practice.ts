import { z } from "zod";

export const practiceSchema = z.object({
  studentId: z.string().min(1),
  semesterId: z.string().min(1),
  course: z.coerce.number().int().positive(),
  kind: z.enum(["EDUCATIONAL", "PRODUCTION", "PREDIPLOMA"]),
  place: z.string().min(1, "Введите место"),
  hours: z.coerce.number().int().nonnegative().optional().nullable(),
  creditUnits: z.coerce.number().nonnegative().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  grade: z.string().optional().nullable(),
  gradeDate: z.string().optional().nullable(),
  instSupervisorId: z.string().min(1),
  orgSupervisorName: z.string().optional().nullable(),
  orgSupervisorPosition: z.string().optional().nullable(),
});
export type PracticeInput = z.infer<typeof practiceSchema>;
