import { z } from "zod";

export const studentProfileSchema = z.object({
  // User-поля
  email: z.string().email("Введите корректный email"),
  fullName: z.string().min(1, "Введите ФИО"),
  newPassword: z.string().min(6, "Минимум 6 символов").optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
  // Student-поля
  recordBookNumber: z.string().min(1, "Введите номер зачётной книжки"),
  groupId: z.string().min(1, "Выберите группу"),
  birthDate: z.string().optional().nullable(),
  enrollmentDate: z.string().min(1, "Введите дату зачисления"),
  enrollmentOrder: z.string().optional().nullable(),
  expulsionDate: z.string().optional().nullable(),
  expulsionOrder: z.string().optional().nullable(),
  academicLeaveDate: z.string().optional().nullable(),
  academicLeaveEndDate: z.string().optional().nullable(),
  academicLeaveOrder: z.string().optional().nullable(),
  currentCourse: z.coerce.number().int().positive(),
}).superRefine((data, ctx) => {
  if (data.academicLeaveDate && data.academicLeaveEndDate) {
    if (data.academicLeaveEndDate < data.academicLeaveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Дата окончания не может быть раньше даты начала",
        path: ["academicLeaveEndDate"],
      });
    }
  }
});
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
