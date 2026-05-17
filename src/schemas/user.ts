import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["STUDENT", "TEACHER", "HEAD"]),
  position: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});
export type UserInput = z.infer<typeof userSchema>;
