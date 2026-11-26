import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, isSameOrigin, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeDb } from "@/lib/safe-db";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const unavailable = { unavailable: true } as const;
  const userResult = await safeDb(() => db.user.findUnique({ where: { email } }), unavailable);
  if (userResult === unavailable) return NextResponse.json({ error: "Data temporarily unavailable. Please try again shortly." }, { status: 503 });
  const user = userResult as Awaited<ReturnType<typeof db.user.findUnique>>;
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionResult = await safeDb(() => createSession(user.id), unavailable);
  if (sessionResult === unavailable) return NextResponse.json({ error: "Data temporarily unavailable. Please try again shortly." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
