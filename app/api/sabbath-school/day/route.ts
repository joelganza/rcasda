import { NextResponse } from "next/server";

import { getDayContent, SabbathApiError } from "@/lib/adventech";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const day = params.get("day") ?? "";
  const quarterId = params.get("quarter") ?? undefined;
  const lessonId = params.get("lesson") ?? undefined;

  if (!/^0[1-7]$/.test(day)) {
    return NextResponse.json(
      { error: "Choose a lesson day from Sabbath to Friday." },
      { status: 400, headers: CORS },
    );
  }

  if (quarterId || lessonId) {
    if (
      !quarterId ||
      !lessonId ||
      !/^\d{4}-0[1-4]$/.test(quarterId) ||
      !/^\d{2}$/.test(lessonId)
    ) {
      return NextResponse.json(
        { error: "Choose a valid quarter and lesson." },
        { status: 400, headers: CORS },
      );
    }
  }

  try {
    const content = await getDayContent(day, { quarterId, lessonId });
    return NextResponse.json(content, {
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[sabbath-widget] day content", error);
    const status = error instanceof SabbathApiError ? 400 : 502;
    return NextResponse.json(
      { error: "That day’s reading could not be loaded. Please try again." },
      { status, headers: { ...CORS, "Cache-Control": "no-store" } },
    );
  }
}