import { z } from "zod";
import { TeachingKindValues } from "@/types/enums";

export const planItemSchema = z.object({
  teacherId: z.string().min(1, "Выберите преподавателя"),
  kind: z.enum(TeachingKindValues),
  controlForm: z.string().optional().nullable(),
  semesterId: z.string().optional().nullable(),
  disciplineId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  hours: z.coerce.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type PlanItemInput = z.infer<typeof planItemSchema>;
