import { NextResponse } from "next/server";

import { getWeek } from "@/lib/adventech";

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
  const quarterId = params.get("quarter") ?? undefined;
  const lessonId = params.get("lesson") ?? undefined;

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
    const week = await getWeek({ quarterId, lessonId });
    return NextResponse.json(week, {
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[sabbath-widget] current week", error);
    return NextResponse.json(
      { error: "The current Sabbath School lesson could not be loaded." },
      { status: 502, headers: { ...CORS, "Cache-Control": "no-store" } },
    );
  }
}