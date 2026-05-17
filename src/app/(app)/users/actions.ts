"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { userSchema } from "@/schemas/user";

export async function createUser(input: unknown) {
  const session = await getSession();
  assertCan(session, "user:create");
  const d = userSchema.parse(input);
  const passwordHash = await hashPassword(d.password && d.password.length > 0 ? d.password : "demo1234");
  const created = await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      fullName: d.fullName,
      role: d.role,
      position: d.position ?? null,
      isActive: d.isActive ?? true,
      passwordHash,
    },
  });
  await audit({ userId: session.userId, action: "CREATE", entity: "User", entityId: created.id, after: { ...created, passwordHash: "[hidden]" } });
  revalidatePath("/users");
}

export async function updateUser(id: string, input: unknown) {
  const session = await getSession();
  assertCan(session, "user:edit");
  const d = userSchema.parse(input);
  const before = await prisma.user.findUnique({ where: { id } });
  const data: Record<string, unknown> = {
    email: d.email.toLowerCase(),
    fullName: d.fullName,
    role: d.role,
    position: d.position ?? null,
    isActive: d.isActive ?? true,
  };
  if (d.password && d.password.length > 0) data.passwordHash = await hashPassword(d.password);
  const updated = await prisma.user.update({ where: { id }, data });
  await audit({
    userId: session.userId, action: "UPDATE", entity: "User", entityId: id,
    before: before ? { ...before, passwordHash: "[hidden]" } : null,
    after: { ...updated, passwordHash: "[hidden]" },
  });
  revalidatePath("/users");
}

export async function toggleUserActive(id: string) {
  const session = await getSession();
  assertCan(session, "user:edit");
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  const updated = await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  await audit({ userId: session.userId, action: "ROLE_CHANGE", entity: "User", entityId: id, before: { isActive: u.isActive }, after: { isActive: updated.isActive } });
  revalidatePath("/users");
}
