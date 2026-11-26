import type { Prisma } from "@prisma/client";

import { formatReference, getBooks, getChapter, parseReference } from "./bible";
import { db } from "./db";
import { bibleHref, hymnHref, lessonHref } from "./routes";
import type { SearchGroup, SearchResponse, SearchResult } from "./search-types";

const GROUP_LABELS = {
  bible: "Bible",
  hymnal: "Hymnal",
  lesson: "Sabbath School",
};

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((token) => token.length > 1)
    .slice(0, 5);
}

export async function searchPlatform(
  rawQuery: string,
  options: { limit?: number; category?: string; translationId?: string } = {},
): Promise<SearchResponse> {
  const started = Date.now();
  const query = rawQuery.trim().slice(0, 120);
  const limit = Math.min(20, Math.max(1, options.limit ?? 8));
  const groups: SearchGroup[] = [];

  if (!query) {
    return { query, groups: [], total: 0, tookMs: 0 };
  }

  const availableTranslations = await db.translation.findMany({
    where: {
      OR: [
        { verificationStatus: "VERIFIED", isComplete: true },
        ...(options.translationId
          ? [
              {
                id: options.translationId,
                verificationStatus: "PENDING",
                verseCount: { gt: 0 },
              },
            ]
          : []),
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
  const translation =
    availableTranslations.find((item) => item.id === options.translationId) ??
    availableTranslations[0];
  const books = await getBooks(
    translation?.languageCode ?? "en",
    translation?.id,
  );

  const wantsBible = !options.category || options.category === "bible";
  const wantsHymnal = !options.category || options.category === "hymnal";
  const wantsLesson = !options.category || options.category === "lesson";

  if (wantsBible && translation) {
    const results: SearchResult[] = [];
    const reference = parseReference(query, books);

    if (reference) {
      const chapter = await getChapter(
        translation.id,
        reference.bookId,
        reference.chapter,
        translation.languageCode,
      );
      if (chapter) {
        if (reference.verse) {
          const start = reference.verse;
          const end = reference.endVerse ?? start;
          const selected = chapter.verses.filter(
            (verse) => verse.number >= start && verse.number <= end,
          );
          if (selected.length) {
            results.push({
              category: "bible",
              id: `${translation.id}-${reference.bookId}-${reference.chapter}-${start}`,
              title: formatReference(
                reference.bookName,
                reference.chapter,
                start,
                reference.endVerse,
              ),
              subtitle: translation.abbreviation,
              excerpt: selected.map((verse) => verse.text).join(" "),
              href: bibleHref(
                translation.id,
                reference.bookId,
                reference.chapter,
                start,
              ),
              meta: translation.abbreviation,
            });
          }
        } else {
          results.push({
            category: "bible",
            id: `${translation.id}-${reference.bookId}-${reference.chapter}`,
            title: formatReference(reference.bookName, reference.chapter),
            subtitle: translation.abbreviation,
            excerpt: chapter.verses
              .slice(0, 3)
              .map((verse) => verse.text)
              .join(" "),
            href: bibleHref(translation.id, reference.bookId, reference.chapter),
            meta: translation.abbreviation,
          });
        }
      }
    }

    const words = tokens(query);
    if (words.length && results.length < limit) {
      const matches = await db.verse.findMany({
        where: {
          translationId: translation.id,
          AND: words.map((word) => ({
            text: { contains: word, mode: "insensitive" },
          })),
        },
        take: 160,
        select: { bookId: true, chapter: true, number: true, text: true },
      });

      const order = new Map(books.map((book) => [book.id, book.order]));
      const names = new Map(books.map((book) => [book.id, book.name]));
      matches.sort(
        (a, b) =>
          (order.get(a.bookId) ?? 99) - (order.get(b.bookId) ?? 99) ||
          a.chapter - b.chapter ||
          a.number - b.number,
      );

      for (const verse of matches) {
        if (results.length >= limit) break;
        const bookName = names.get(verse.bookId) ?? verse.bookId;
        results.push({
          category: "bible",
          id: `${translation.id}-${verse.bookId}-${verse.chapter}-${verse.number}`,
          title: formatReference(bookName, verse.chapter, verse.number),
          subtitle: translation.abbreviation,
          excerpt: verse.text,
          href: bibleHref(translation.id, verse.bookId, verse.chapter, verse.number),
          meta: translation.abbreviation,
        });
      }
    }

    if (results.length) {
      groups.push({
        category: "bible",
        label: GROUP_LABELS.bible,
        results,
        total: results.length,
      });
    }
  }

  const words = tokens(query);

  if (wantsHymnal) {
    const numeric = /^\d{1,4}$/.test(query);
    const hymnWhere: Prisma.HymnWhereInput = numeric
      ? { number: Number(query) }
      : {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { firstLine: { contains: query, mode: "insensitive" } },
            ...(words.length
              ? [
                  {
                    stanzas: {
                      some: {
                        text: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                ]
              : []),
          ],
        };
    const hymns = await db.hymn.findMany({
      where: hymnWhere,
      take: limit,
      include: { collection: { select: { id: true, name: true, languageCode: true } } },
      orderBy: [{ collectionId: "asc" }, { number: "asc" }],
    });

    if (hymns.length) {
      groups.push({
        category: "hymnal",
        label: GROUP_LABELS.hymnal,
        results: hymns.map((hymn) => ({
          category: "hymnal",
          id: `hymn-${hymn.id}`,
          title: hymn.title,
          subtitle: hymn.firstLine,
          excerpt: `Hymn ${hymn.number} · ${hymn.collection.name}`,
          href: hymnHref(hymn.collectionId, hymn.number),
          meta: `No. ${hymn.number}`,
        })),
        total: hymns.length,
      });
    }
  }

  if (wantsLesson) {
    const lessons = await db.lesson.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      take: limit,
      include: { quarter: { select: { id: true, title: true, year: true, quarter: true } } },
      orderBy: [{ quarter: { year: "desc" } }, { number: "asc" }],
    });

    if (lessons.length) {
      groups.push({
        category: "lesson",
        label: GROUP_LABELS.lesson,
        results: lessons.map((lesson) => ({
          category: "lesson",
          id: `lesson-${lesson.id}`,
          title: `Lesson ${lesson.number}: ${lesson.title}`,
          subtitle: lesson.quarter.title,
          excerpt: `${lesson.quarter.quarter} ${lesson.quarter.year} · ${lesson.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${lesson.endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
          href: lessonHref(lesson.quarterId, lesson.number),
          meta: "Sabbath School",
        })),
        total: lessons.length,
      });
    }
  }

  return {
    query,
    groups,
    total: groups.reduce((sum, group) => sum + group.results.length, 0),
    tookMs: Date.now() - started,
  };
}
