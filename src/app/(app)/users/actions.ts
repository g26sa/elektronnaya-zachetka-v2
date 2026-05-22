"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { userSchema } from "@/schemas/user";
import { generatePassword, sendCredentialsEmail } from "@/lib/mailer";

export type CreateUserResult = { ok: true; emailSent: boolean };

export async function createUser(input: unknown): Promise<CreateUserResult> {
  const session = await getSession();
  assertCan(session, "user:create");
  const d = userSchema.parse(input);
  const plain = d.password && d.password.length > 0 ? d.password : generatePassword(12);
  const passwordHash = await hashPassword(plain);
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

  const mail = await sendCredentialsEmail({
    to: created.email,
    fullName: created.fullName,
    password: plain,
  });

  await audit({
    userId: session.userId,
    action: "CREATE",
    entity: "User",
    entityId: created.id,
    after: { ...created, passwordHash: "[hidden]" },
  });
  revalidatePath("/users");
  return { ok: true, emailSent: mail.ok };
}

export type UpdateUserResult = { ok: true; emailSent?: boolean };

export async function updateUser(id: string, input: unknown): Promise<UpdateUserResult> {
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
  let emailSent: boolean | undefined;
  if (d.password && d.password.length > 0) {
    data.passwordHash = await hashPassword(d.password);
    const updated = await prisma.user.update({ where: { id }, data });
    const mail = await sendCredentialsEmail({
      to: updated.email,
      fullName: updated.fullName,
      password: d.password,
      isReset: true,
    });
    emailSent = mail.ok;
    await audit({
      userId: session.userId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      before: before ? { ...before, passwordHash: "[hidden]" } : null,
      after: { ...updated, passwordHash: "[hidden]" },
    });
    revalidatePath("/users");
    return { ok: true, emailSent };
  }
  const updated = await prisma.user.update({ where: { id }, data });
  await audit({
    userId: session.userId,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    before: before ? { ...before, passwordHash: "[hidden]" } : null,
    after: { ...updated, passwordHash: "[hidden]" },
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUserActive(id: string) {
  const session = await getSession();
  assertCan(session, "user:edit");
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  const updated = await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  await audit({
    userId: session.userId,
    action: "ROLE_CHANGE",
    entity: "User",
    entityId: id,
    before: { isActive: u.isActive },
    after: { isActive: updated.isActive },
  });
  revalidatePath("/users");
}
