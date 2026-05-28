import { z } from "zod";

export const vkrSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(1, "Введите тему"),
  type: z.string().optional().nullable(),
  approvedOrder: z.string().optional().nullable(),
  approvedDate: z.string().optional().nullable(),
  supervisorId: z.string().min(1),
});
export type VkrInput = z.infer<typeof vkrSchema>;

export const defenseSchema = z.object({
  vkrId: z.string().min(1),
  admission: z.enum(["ADMITTED", "NOT_ADMITTED"]),
  admissionDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  chairId: z.string().optional().nullable(),
  protocolNumber: z.string().optional().nullable(),
});
export type DefenseInput = z.infer<typeof defenseSchema>;

export const stateExamSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1, "Введите название"),
  admission: z.enum(["ADMITTED", "NOT_ADMITTED"]),
  admissionDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  chairGekId: z.string().optional().nullable(),
  protocolNumber: z.string().optional().nullable(),
});
export type StateExamInput = z.infer<typeof stateExamSchema>;
