import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { db } from "../lib/db";

type BibleSource = {
  books?: {
    book: string;
    chapters: { chapter: number; verses: { number: number }[] }[];
  }[];
};

type KinyarwandaSource = {
  id: string;
  chapters: { number: number; verses: { number: number }[] }[];
}[];

function sourceBible(file: string): BibleSource | null {
  const sourcePath = path.join(process.cwd(), "content", "cache", file);
  if (!existsSync(sourcePath)) return null;
  return JSON.parse(readFileSync(sourcePath, "utf8")) as BibleSource;
}

function sourceVerseKeys(source: BibleSource | null): Set<string> | null {
  if (!source?.books) return null;
  return new Set(
    source.books.flatMap((book) =>
      book.chapters.flatMap((chapter) =>
        chapter.verses.map(
          (verse) => `${book.book}:${chapter.chapter}:${verse.number}`,
        ),
      ),
    ),
  );
}

function countSourceVerses(source: BibleSource | null): number | null {
  if (!source?.books) return null;
  return source.books.reduce(
    (bookTotal, book) =>
      bookTotal +
      book.chapters.reduce(
        (chapterTotal, chapter) => chapterTotal + chapter.verses.length,
        0,
      ),
    0,
  );
}

function kinyarwandaSourceKeys(): Set<string> | null {
  const parsedPath = path.join(process.cwd(), "content", "cache", "kinyarwanda-parsed.json");
  const supplementPath = path.join(process.cwd(), "scripts", "kinyarwanda-supplement.json");
  if (!existsSync(parsedPath) || !existsSync(supplementPath)) return null;
  const books = JSON.parse(readFileSync(parsedPath, "utf8")) as KinyarwandaSource;
  const supplement = JSON.parse(readFileSync(supplementPath, "utf8")) as {
    chapters: Record<string, { number: number }[]>;
  };
  const versesByChapter = new Map<string, Set<number>>();
  for (const book of books) {
    for (const chapter of book.chapters) {
      versesByChapter.set(
        `${book.id}:${chapter.number}`,
        new Set(chapter.verses.map((verse) => verse.number)),
      );
    }
  }
  for (const [chapterKey, verses] of Object.entries(supplement.chapters)) {
    const [bookId, chapterNumber] = chapterKey.split(".");
    versesByChapter.set(
      `${bookId}:${chapterNumber}`,
      new Set(verses.map((verse) => verse.number)),
    );
  }
  return new Set(
    [...versesByChapter].flatMap(([chapterKey, verses]) =>
      [...verses].map((number) => `${chapterKey}:${number}`),
    ),
  );
}

function row(label: string, expected: string, actual: string, status: string) {
  return `| ${label} | ${expected} | ${actual} | ${status} |`;
}

async function main() {
  const [books, translations, verseGroups, quarters, lessons, lessonDays] =
    await Promise.all([
      db.book.findMany({
        orderBy: { order: "asc" },
        select: { id: true, order: true, chapterCount: true },
      }),
      db.translation.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          verificationStatus: true,
          isComplete: true,
          verseCount: true,
          chapterCount: true,
          bookCount: true,
        },
      }),
      db.verse.groupBy({
        by: ["translationId", "bookId", "chapter"],
        _count: { _all: true },
      }),
      db.quarter.count(),
      db.lesson.count(),
      db.lessonDay.count(),
    ]);

  const verseCounts = await db.verse.groupBy({
    by: ["translationId"],
    _count: { _all: true },
  });
  const countByTranslation = new Map(
    verseCounts.map((entry) => [entry.translationId, entry._count._all]),
  );
  const chapterMap = new Map<string, Set<number>>();
  for (const group of verseGroups) {
    const key = `${group.translationId}:${group.bookId}`;
    const chapters = chapterMap.get(key) ?? new Set<number>();
    chapters.add(group.chapter);
    chapterMap.set(key, chapters);
  }

  const translationById = new Map(translations.map((item) => [item.id, item]));
  const actualVerseKeys = new Map<string, Set<string>>();
  for (const id of ["kjv", "web", "kin"]) {
    const rows = await db.verse.findMany({
      where: { translationId: id },
      select: { bookId: true, chapter: true, number: true },
    });
    actualVerseKeys.set(
      id,
      new Set(rows.map((verse) => `${verse.bookId}:${verse.chapter}:${verse.number}`)),
    );
  }

  const lines = [
    "| Content | Expected | Actual | Status |",
    "|---|---:|---:|---|",
  ];

  const kjvJson = sourceBible("kjv.json");
  const webJson = sourceBible("web.json");
  const kjvSource = sourceVerseKeys(kjvJson);
  const webSource = sourceVerseKeys(webJson);
  const canonicalIds = new Set(kjvSource ? [...kjvSource].map((key) => key.split(":")[0]) : []);
  const actualKjv = actualVerseKeys.get("kjv") ?? new Set<string>();
  const actualWeb = actualVerseKeys.get("web") ?? new Set<string>();
  const compare = (
    source: Set<string> | null,
    sourceCount: number | null,
    expectedCount: number,
    actual: Set<string>,
  ) => {
    if (!source) return "SOURCE CACHE MISSING";
    const missing = [...source].filter((key) => !actual.has(key)).length;
    const extra = [...actual].filter((key) => !source.has(key)).length;
    return sourceCount === expectedCount && source.size === expectedCount && missing === 0 && extra === 0
      ? "PASS"
      : `FAIL (${missing} missing, ${extra} extra, source ${sourceCount ?? "missing"})`;
  };

  lines.push(
    row(
      "Canonical Bible books",
      "66",
      String(books.length),
      books.length === 66 && (!kjvSource || canonicalIds.size === 66) ? "PASS" : "FAIL",
    ),
    row("KJV verses", "31,102", String(countByTranslation.get("kjv") ?? 0), compare(kjvSource, countSourceVerses(kjvJson), 31102, actualKjv)),
    row("WEB verses", "31,098", String(countByTranslation.get("web") ?? 0), compare(webSource, countSourceVerses(webJson), 31098, actualWeb)),
  );

  const kin = translationById.get("kin");
  const kinCount = countByTranslation.get("kin") ?? 0;
  const kinSourceKeys = kinyarwandaSourceKeys();
  const kinActualKeys = actualVerseKeys.get("kin") ?? new Set<string>();
  const kinChapterCount = verseGroups.filter((group) => group.translationId === "kin").length;
  const kinBooks = new Set(
    verseGroups.filter((group) => group.translationId === "kin").map((group) => group.bookId),
  ).size;
  lines.push(
    row(
      "Kinyarwanda Bible",
      kinSourceKeys ? kinSourceKeys.size.toLocaleString() + " parsed source keys" : "Parser cache unavailable",
      `${kinBooks} books, ${kinChapterCount} populated chapters, ${kinCount} verses; metadata ${kin?.verificationStatus ?? "missing"}/${kin?.isComplete ? "complete" : "incomplete"}`,
      kinSourceKeys && kinCount === kinSourceKeys.size &&
      [...kinSourceKeys].every((key) => kinActualKeys.has(key)) &&
      [...kinActualKeys].every((key) => kinSourceKeys.has(key))
        ? "KEYS MATCH; PDF text and rights review pending"
        : kinCount > 0
          ? "FAIL OR SOURCE CACHE MISSING"
          : "FAIL: no records",
    ),
  );

  const [rwHymnRows, enHymns, unavailableEnglish, lessonBodies] =
    await Promise.all([
      db.hymn.findMany({
        where: { collectionId: "sda-hymnal-rw" },
        orderBy: { number: "asc" },
        select: {
          number: true,
          title: true,
          firstLine: true,
          stanzas: { orderBy: { order: "asc" }, select: { kind: true, text: true } },
        },
      }),
      db.hymn.count({ where: { collectionId: "hymnary-pd-en" } }),
      db.hymnCollection.findUnique({
        where: { id: "sda-hymnal-en" },
        select: { verificationStatus: true, hymnCount: true },
      }),
      db.lessonDay.count({ where: { body: { not: null } } }),
    ]);
  const rwHymns = rwHymnRows.length;
  const rwStanzas = rwHymnRows.reduce((sum, hymn) => sum + hymn.stanzas.length, 0);
  const hymnSourcePath = path.join(process.cwd(), "content", "cache", "kinyarwanda-hymnal.json");
  const hymnSource = existsSync(hymnSourcePath)
    ? (JSON.parse(readFileSync(hymnSourcePath, "utf8")) as {
        hymns?: {
          number: number;
          title: string;
          firstLine: string;
          stanzas?: { kind: string; text: string }[];
        }[];
      })
    : null;
  const dbHymnsByNumber = new Map(rwHymnRows.map((hymn) => [hymn.number, hymn]));
  const hymnContentMatches =
    hymnSource?.hymns?.length === 500 &&
    new Set(hymnSource.hymns.map((hymn) => hymn.number)).size === 500 &&
    hymnSource.hymns.every((sourceHymn) => {
      const dbHymn = dbHymnsByNumber.get(sourceHymn.number);
      return Boolean(
        dbHymn &&
          dbHymn.title === sourceHymn.title &&
          dbHymn.firstLine === sourceHymn.firstLine &&
          dbHymn.stanzas.length === sourceHymn.stanzas?.length &&
          dbHymn.stanzas.every(
            (stanza, index) =>
              stanza.kind === sourceHymn.stanzas?.[index]?.kind &&
              stanza.text === sourceHymn.stanzas?.[index]?.text,
          ),
      );
    });
  const suppliedStanzas = hymnSource?.hymns?.reduce(
    (sum, hymn) => sum + (hymn.stanzas?.length ?? 0),
    0,
  );
  lines.push(
    row(
      "Kinyarwanda hymns",
      "500",
      String(rwHymns),
      rwHymns === 500 && hymnContentMatches
        ? "DATABASE MATCHES PARSED PDF; human text/rights review pending"
        : "FAIL OR SOURCE CACHE MISSING",
    ),
    row(
      "Kinyarwanda stanzas",
      suppliedStanzas === undefined ? "2,142 source cache or PDF audit" : String(suppliedStanzas),
      String(rwStanzas),
      rwStanzas === suppliedStanzas && suppliedStanzas === 2142 && hymnContentMatches
        ? "DATABASE MATCHES PARSED PDF; human text/rights review pending"
        : "FAIL OR SOURCE CACHE MISSING",
    ),
    row("Public-domain English hymn records", "Source-dependent", String(enHymns), "COUNTED; not the official SDA hymnal"),
    row(
      "Official English SDA hymnal",
      "Unavailable pending authorization",
      `${unavailableEnglish?.verificationStatus ?? "not catalogued"}; ${unavailableEnglish?.hymnCount ?? 0} records`,
      unavailableEnglish?.verificationStatus === "UNAVAILABLE" && unavailableEnglish.hymnCount === 0
        ? "PASS"
        : "REVIEW",
    ),
    row("Sabbath School quarters", "Available official source count not established", String(quarters), "DATABASE COUNT; completeness unverified"),
    row("Sabbath School lessons", "Available official source count not established", String(lessons), "DATABASE COUNT; completeness unverified"),
    row("Sabbath School lesson days", "Official API content fetched on demand", `${lessonDays} metadata days; ${lessonBodies} stored bodies`, "LINK/API-ONLY CONTENT"),
  );

  console.log(lines.join("\n"));
  console.log("\nChapter coverage and metadata checks:");
  for (const translation of translations) {
    const chapterRows = verseGroups.filter((group) => group.translationId === translation.id);
    const missingChapters = books.reduce((sum, book) => {
      const actual = chapterMap.get(`${translation.id}:${book.id}`)?.size ?? 0;
      return sum + Math.max(0, book.chapterCount - actual);
    }, 0);
    console.log(
      `- ${translation.id}: ${countByTranslation.get(translation.id) ?? 0} verses; metadata ${translation.verseCount}; ${chapterRows.length} populated chapters; ${missingChapters} canonical chapters missing; ${translation.verificationStatus}; complete=${translation.isComplete}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("Content audit failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
