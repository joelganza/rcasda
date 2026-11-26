import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "./db";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "rca_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({ data: { id, userId, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.session.deleteMany({ where: { id } });
  }
  store.delete(SESSION_COOKIE);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  let session;
  try {
    session = await db.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  } catch (error) {
    console.error("Unable to look up session:", error);
    return null;
  }

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }

  return session.user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

/**
 * Mutating endpoints are only reachable from this origin. Requests without an
 * Origin header (same-origin navigations, curl during local setup) are allowed;
 * cross-site browser requests always carry one.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
