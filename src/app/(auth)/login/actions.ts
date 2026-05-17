"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = { error?: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Некорректные данные" };
  }
  const session = await login(parsed.data.email, parsed.data.password);
  if (!session) return { error: "Неверный email или пароль" };
  await audit({ userId: session.userId, action: "LOGIN", entity: "User", entityId: session.userId });
  redirect("/dashboard");
}
