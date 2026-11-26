import { db } from "./db";
import type {
  HistoryEntry,
  LibrarySnapshot,
  SavedKind,
  SavedType,
  VerseRef,
} from "./types";

const SAVED_TYPES = new Set<SavedType>(["bookmark", "favorite", "note"]);
const SAVED_KINDS = new Set<SavedKind>([
  "verse",
  "passage",
  "hymn",
  "lesson",
  "day",
  "plan",
]);

type Unknown = Record<string, unknown>;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function ref(value: unknown): VerseRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Unknown;
  const translationId = text(source.translationId, 40);
  const bookId = text(source.bookId, 40);
  const bookName = text(source.bookName, 120);
  const chapter = Number(source.chapter);
  const verse = Number(source.verse);
  const endVerse =
    source.endVerse === undefined ? undefined : Number(source.endVerse);
  if (!translationId || !bookId || !bookName) return undefined;
  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) return undefined;
  return {
    translationId,
    bookId,
    bookName,
    chapter,
    verse,
    ...(Number.isInteger(endVerse) ? { endVerse } : {}),
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function getLibrarySnapshot(userId: string): Promise<LibrarySnapshot> {
  const [items, history, lessonProgress, planProgress] = await Promise.all([
    db.savedItem.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    db.readingHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    db.lessonProgress.findMany({ where: { userId }, orderBy: { completedAt: "desc" } }),
    db.planProgress.findMany({ where: { userId }, orderBy: { completedAt: "desc" } }),
  ]);

  return {
    items: items.map((item) => ({
      clientId: item.clientId,
      type: item.type as SavedType,
      kind: item.kind as SavedKind,
      title: item.title,
      subtitle: item.subtitle ?? undefined,
      body: item.body ?? undefined,
      href: item.href,
      ref: parseRef(item.refJson),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    history: history.map((entry) => ({
      clientId: entry.clientId,
      kind: entry.kind as SavedKind,
      title: entry.title,
      subtitle: entry.subtitle ?? undefined,
      href: entry.href,
      ref: parseRef(entry.refJson),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    lessonProgress: lessonProgress.map((entry) => ({
      lessonId: entry.lessonId,
      dayIndex: entry.dayIndex,
      completedAt: entry.completedAt.toISOString(),
    })),
    planProgress: planProgress.map((entry) => ({
      planId: entry.planId,
      day: entry.day,
      completedAt: entry.completedAt.toISOString(),
    })),
  };
}

function parseRef(value: string | null): VerseRef | undefined {
  if (!value) return undefined;
  try {
    return ref(JSON.parse(value));
  } catch {
    return undefined;
  }
}

/**
 * Replaces the member's library with a validated snapshot. Client IDs are
 * deduplicated so a retried request cannot create duplicates. Limits keep one
 * member from filling the database through this endpoint.
 */
export async function replaceLibrary(userId: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("INVALID_LIBRARY");
  }
  const source = payload as Unknown;

  const seenItems = new Set<string>();
  const items = asArray(source.items)
    .slice(0, 500)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Unknown;
      const clientId = text(item.clientId, 200);
      const type = item.type as SavedType;
      const kind = item.kind as SavedKind;
      const title = text(item.title, 300);
      const href = text(item.href, 1000);
      if (!clientId || !title || !href || !SAVED_TYPES.has(type) || !SAVED_KINDS.has(kind)) {
        return null;
      }
      if (seenItems.has(clientId)) return null;
      seenItems.add(clientId);
      return {
        clientId,
        type,
        kind,
        title,
        subtitle: text(item.subtitle, 300),
        body: text(item.body, 20_000),
        href,
        refJson: JSON.stringify(ref(item.ref) ?? {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const seenHistory = new Set<string>();
  const history = asArray(source.history)
    .slice(0, 100)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Unknown;
      const clientId = text(item.clientId, 200);
      const kind = item.kind as SavedKind;
      const title = text(item.title, 300);
      const href = text(item.href, 1000);
      if (!clientId || !title || !href || !SAVED_KINDS.has(kind)) return null;
      if (seenHistory.has(clientId)) return null;
      seenHistory.add(clientId);
      return {
        clientId,
        kind,
        title,
        subtitle: text(item.subtitle, 300),
        href,
        refJson: JSON.stringify(ref(item.ref) ?? {}),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const seenLessonDays = new Set<string>();
  const lessonProgress = asArray(source.lessonProgress)
    .slice(0, 2_000)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Unknown;
      const lessonId = text(item.lessonId, 120);
      const dayIndex = Number(item.dayIndex);
      if (!lessonId || !Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 8) {
        return null;
      }
      const key = `${lessonId}:${dayIndex}`;
      if (seenLessonDays.has(key)) return null;
      seenLessonDays.add(key);
      return { lessonId, dayIndex };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const seenPlanDays = new Set<string>();
  const planProgress = asArray(source.planProgress)
    .slice(0, 5_000)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Unknown;
      const planId = text(item.planId, 120);
      const day = Number(item.day);
      if (!planId || !Number.isInteger(day) || day < 1 || day > 1_000) return null;
      const key = `${planId}:${day}`;
      if (seenPlanDays.has(key)) return null;
      seenPlanDays.add(key);
      return { planId, day };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  await db.$transaction(async (tx) => {
    await tx.savedItem.deleteMany({ where: { userId } });
    await tx.readingHistory.deleteMany({ where: { userId } });
    await tx.lessonProgress.deleteMany({ where: { userId } });
    await tx.planProgress.deleteMany({ where: { userId } });

    if (items.length) {
      await tx.savedItem.createMany({
        data: items.map((item) => ({ ...item, userId })),
      });
    }
    if (history.length) {
      await tx.readingHistory.createMany({
        data: history.map((entry) => ({ ...entry, userId })),
      });
    }
    if (lessonProgress.length) {
      await tx.lessonProgress.createMany({
        data: lessonProgress.map((entry) => ({ ...entry, userId })),
      });
    }
    if (planProgress.length) {
      await tx.planProgress.createMany({
        data: planProgress.map((entry) => ({ ...entry, userId })),
      });
    }
  });

  return getLibrarySnapshot(userId);
}

export type { HistoryEntry };
