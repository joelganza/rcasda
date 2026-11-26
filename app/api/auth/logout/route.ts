import { NextResponse } from "next/server";

import { destroySession, isSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }
  await destroySession();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
