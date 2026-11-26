import { db } from "./db";

export const DAYS = [
  "sabbath",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type LessonDayName = (typeof DAYS)[number];

export const DAY_LABELS: Record<LessonDayName, string> = {
  sabbath: "Sabbath",
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

/**
 * Translations that are shown in the picker, including ones without text.
 * An edition with `verificationStatus: "UNAVAILABLE"` is listed honestly and
 * opens an explanation instead of fabricated Scripture.
 */
export async function listTranslations() {
  return db.translation.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getTranslation(id: string) {
  return db.translation.findUnique({ where: { id } });
}

/** The translation the reader falls back to when a request has none. */
export async function defaultTranslationId(): Promise<string | null> {
  const available = await db.translation.findFirst({
    where: { verificationStatus: "VERIFIED", isComplete: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  return available?.id ?? null;
}

export async function listHymnCollections() {
  return db.hymnCollection.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getHymnCollection(id: string) {
  return db.hymnCollection.findUnique({ where: { id } });
}

export async function getCurrentQuarter() {
  return db.quarter.findFirst({ orderBy: [{ year: "desc" }, { quarter: "desc" }] });
}

export async function getQuarter(id: string) {
  return db.quarter.findUnique({ where: { id } });
}

export async function listQuarters() {
  return db.quarter.findMany({
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    select: {
      id: true,
      year: true,
      quarter: true,
      title: true,
      humanDate: true,
      verificationStatus: true,
      contentPermission: true,
    },
  });
}

export const VERIFICATION_LABELS: Record<string, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending verification",
  UNAVAILABLE: "Unavailable",
};

export function verificationTone(status: string): string {
  if (status === "VERIFIED") return "text-emerald-700 dark:text-emerald-400";
  if (status === "PENDING") return "text-amber-700 dark:text-amber-400";
  return "text-muted";
}
