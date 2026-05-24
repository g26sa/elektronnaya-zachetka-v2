import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jwtSecret } from "@/lib/jwtSecret";
import type { Role } from "@/types/enums";

const SESSION_COOKIE = "ezk_session";
const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

export type SessionPayload = {
  userId: string;
  role: Role;
  fullName: string;
  email: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(jwtSecret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    const jwt = payload as unknown as SessionPayload;
    if (!jwt.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: jwt.userId },
      select: { id: true, role: true, fullName: true, email: true, isActive: true },
    });
    if (!user?.isActive) return null;

    return {
      userId: user.id,
      role: user.role as Role,
      fullName: user.fullName,
      email: user.email,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Не вызываем clearSessionCookie здесь: getSession вызывается из Server Components,
  // а cookies() можно менять только в Server Action или Route Handler.
  return verifySession(token);
}

/**
 * Require an authenticated session, redirect to /login otherwise.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Require one of the listed roles, otherwise redirect to /dashboard.
 */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}

export async function login(email: string, password: string): Promise<SessionPayload | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role as Role,
    fullName: user.fullName,
    email: user.email,
  };
  const token = await signSession(payload);
  await setSessionCookie(token);
  return payload;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
