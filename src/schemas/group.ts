import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1, "Введите название группы"),
  speciality: z.string().optional().nullable(),
  startYear: z.coerce.number().int().min(1990, "Год должен быть после 1990").max(2100),
});
export type GroupInput = z.infer<typeof groupSchema>;
