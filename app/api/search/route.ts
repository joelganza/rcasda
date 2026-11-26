import { NextResponse } from "next/server";

import { searchPlatform } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? undefined;
  const translationId = url.searchParams.get("translation") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 8);

  if (!query.trim()) {
    return NextResponse.json({ query: "", groups: [], total: 0, tookMs: 0 });
  }

  try {
    const payload = await searchPlatform(query, {
      category:
        category === "bible" || category === "hymnal" || category === "lesson"
          ? category
          : undefined,
      translationId,
      limit: Number.isFinite(limit) ? limit : 8,
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("search failed", error);
    return NextResponse.json(
      { error: "Search is unavailable right now. Please try again." },
      { status: 500 },
    );
  }
}
