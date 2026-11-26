import { db } from "./db";

export async function listPlans() {
  return db.readingPlan.findMany({
    orderBy: { days: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function getPlan(slug: string) {
  return db.readingPlan.findUnique({
    where: { slug },
    include: { items: { orderBy: { day: "asc" } } },
  });
}

export function parsePassages(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}
