import { NextResponse } from "next/server";

import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { getLibrarySnapshot, replaceLibrary } from "@/lib/library-store";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  return NextResponse.json(await getLibrarySnapshot(user.id), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid library payload." }, { status: 400 });
  }

  try {
    const snapshot = await replaceLibrary(user.id, payload);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("library sync failed", error);
    return NextResponse.json(
      { error: "Your library could not be saved. Please try again." },
      { status: 400 },
    );
  }
}
