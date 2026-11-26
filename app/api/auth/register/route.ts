import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, hashPassword, isSameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeDb } from "@/lib/safe-db";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
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
    return NextResponse.json(
      {
        error:
          "Enter a valid email address and a password of at least 10 characters.",
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const unavailable = { unavailable: true } as const;
  const existingResult = await safeDb(() => db.user.findUnique({ where: { email } }), unavailable);
  if (existingResult === unavailable) return NextResponse.json({ error: "Data temporarily unavailable. Please try again shortly." }, { status: 503 });
  const existing = existingResult as Awaited<ReturnType<typeof db.user.findUnique>>;
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists. Try signing in." },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const userResult = await safeDb(() => db.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash,
        role: "MEMBER",
      },
    }), unavailable);
    if (userResult === unavailable) return NextResponse.json({ error: "Data temporarily unavailable. Please try again shortly." }, { status: 503 });
    const user = userResult as Awaited<ReturnType<typeof db.user.create>>;
    const sessionResult = await safeDb(() => createSession(user.id), unavailable);
    if (sessionResult === unavailable) return NextResponse.json({ error: "Data temporarily unavailable. Please try again shortly." }, { status: 503 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && (("code" in error && (error.code === "P1001" || error.code === "P2024")) || ("name" in error && error.name === "PrismaClientInitializationError"))) throw error;
    console.error("registration failed", error);
    return NextResponse.json(
      { error: "The account could not be created. Please try again." },
      { status: 500 },
    );
  }
}
