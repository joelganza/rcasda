import { db } from "./db";
import { cache } from "react";

export type BookSummary = {
  id: string;
  order: number;
  testament: string;
  chapterCount: number;
  name: string;
  abbreviation: string;
};

export type VerseRow = {
  number: number;
  text: string;
};

export type ParsedReference = {
  bookId: string;
  bookName: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
};

const ALIASES: Record<string, string> = {
  psalm: "Ps",
  psalms: "Ps",
  songofsongs: "Song",
  songofsolomon: "Song",
  canticles: "Song",
  ecclesiastes: "Eccl",
  qoheleth: "Eccl",
  revelation: "Rev",
  revelations: "Rev",
  apocalypse: "Rev",
  joshua: "Josh",
  judges: "Judg",
  "1samuel": "1Sam",
  "2samuel": "2Sam",
  "1kings": "1Kgs",
  "2kings": "2Kgs",
  "1chronicles": "1Chr",
  "2chronicles": "2Chr",
  "1corinthians": "1Cor",
  "2corinthians": "2Cor",
  "1thessalonians": "1Thess",
  "2thessalonians": "2Thess",
  "1timothy": "1Tim",
  "2timothy": "2Tim",
  "1peter": "1Pet",
  "2peter": "2Pet",
  "1john": "1John",
  "2john": "2John",
  "3john": "3John",
  philemon: "Phlm",
  philippians: "Phil",
  colossians: "Col",
  ephesians: "Eph",
  galatians: "Gal",
  hebrews: "Heb",
  james: "Jas",
  jude: "Jude",
  matthew: "Matt",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  acts: "Acts",
  romans: "Rom",
  genesis: "Gen",
  exodus: "Exod",
  leviticus: "Lev",
  numbers: "Num",
  deuteronomy: "Deut",
  ruth: "Ruth",
  ezra: "Ezra",
  nehemiah: "Neh",
  esther: "Esth",
  job: "Job",
  proverbs: "Prov",
  isaiah: "Isa",
  jeremiah: "Jer",
  lamentations: "Lam",
  ezekiel: "Ezek",
  daniel: "Dan",
  hosea: "Hos",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obad",
  jonah: "Jonah",
  micah: "Mic",
  nahum: "Nah",
  habakkuk: "Hab",
  zephaniah: "Zeph",
  haggai: "Hag",
  zechariah: "Zech",
  malachi: "Mal",
  ezekielbook: "Ezek",
};

function normalizeBookToken(value: string): string {
  return value.toLowerCase().replace(/[.\s]/g, "");
}

const translationChapterCounts = cache(async (translationId: string) => {
  const rows = await db.verse.groupBy({
    by: ["bookId", "chapter"],
    where: { translationId },
    _count: { _all: true },
  });
  const counts = new Map<string, number[]>();
  for (const row of rows) {
    const chapters = counts.get(row.bookId) ?? [];
    chapters[row.chapter - 1] = row._count._all;
    counts.set(row.bookId, chapters);
  }
  return counts;
});

export async function getBooks(
  languageCode = "en",
  translationId?: string,
): Promise<BookSummary[]> {
  const books = await db.book.findMany({
    orderBy: { order: "asc" },
    include: { names: { where: { languageCode } } },
  });
  const fallback = books.length
    ? await db.bookName.findMany({ where: { languageCode: "en" } })
    : [];
  const fallbackMap = new Map(fallback.map((name) => [name.bookId, name]));
  const chapterCounts = translationId
    ? await translationChapterCounts(translationId)
    : null;

  return books.map((book) => {
    const name = book.names[0] ?? fallbackMap.get(book.id);
    const counts = chapterCounts?.get(book.id);
    return {
      id: book.id,
      order: book.order,
      testament: book.testament,
      chapterCount: counts?.length ?? book.chapterCount,
      name: name?.name ?? book.id,
      abbreviation: name?.abbreviation ?? book.id,
    };
  });
}

export async function getBook(
  bookId: string,
  languageCode = "en",
  translationId?: string,
) {
  const book = await db.book.findUnique({
    where: { id: bookId },
    include: { names: { where: { languageCode } } },
  });
  if (!book) return null;
  const fallback =
    book.names[0] ??
    (await db.bookName.findFirst({
      where: { bookId: book.id, languageCode: "en" },
    }));
  const counts = translationId
    ? (await translationChapterCounts(translationId)).get(book.id)
    : null;
  return {
    id: book.id,
    order: book.order,
    testament: book.testament,
    chapterCount: counts?.length ?? book.chapterCount,
    versesPerChapter: counts ?? (JSON.parse(book.versesPerChapter) as number[]),
    name: fallback?.name ?? book.id,
    abbreviation: fallback?.abbreviation ?? book.id,
  };
}

export type ChapterData = {
  bookId: string;
  bookName: string;
  chapter: number;
  chapterCount: number;
  verses: VerseRow[];
};

export async function getChapter(
  translationId: string,
  bookId: string,
  chapter: number,
  languageCode = "en",
): Promise<ChapterData | null> {
  const book = await getBook(bookId, languageCode, translationId);
  if (!book || chapter < 1 || chapter > book.chapterCount) return null;

  const verses = await db.verse.findMany({
    where: { translationId, bookId, chapter },
    orderBy: { number: "asc" },
    select: { number: true, text: true },
  });

  return {
    bookId,
    bookName: book.name,
    chapter,
    chapterCount: book.chapterCount,
    verses,
  };
}

export async function getVerse(
  translationId: string,
  bookId: string,
  chapter: number,
  verse: number,
) {
  return db.verse.findUnique({
    where: {
      translationId_bookId_chapter_number: {
        translationId,
        bookId,
        chapter,
        number: verse,
      },
    },
  });
}

export async function getChapterNeighbours(
  bookId: string,
  chapter: number,
  languageCode = "en",
  translationId?: string,
) {
  const book = await getBook(bookId, languageCode, translationId);
  if (!book) return { previous: null, next: null };

  if (chapter > 1) {
    return {
      previous: { bookId, bookName: book.name, chapter: chapter - 1 },
      next:
        chapter < book.chapterCount
          ? { bookId, bookName: book.name, chapter: chapter + 1 }
          : await nextBook(book.order, languageCode),
    };
  }

  return {
    previous: await previousBook(book.order, languageCode, translationId),
    next: chapter < book.chapterCount ? { bookId, bookName: book.name, chapter: 2 } : null,
  };
}

async function nextBook(order: number, languageCode = "en") {
  const book = await db.book.findFirst({
    where: { order: { gt: order } },
    orderBy: { order: "asc" },
    include: { names: { where: { languageCode } } },
  });
  if (!book) return null;
  return { bookId: book.id, bookName: book.names[0]?.name ?? book.id, chapter: 1 };
}

async function previousBook(order: number, languageCode = "en", translationId?: string) {
  const book = await db.book.findFirst({
    where: { order: { lt: order } },
    orderBy: { order: "desc" },
    include: { names: { where: { languageCode } } },
  });
  if (!book) return null;
  const counts = translationId
    ? (await translationChapterCounts(translationId)).get(book.id)
    : null;
  return {
    bookId: book.id,
    bookName: book.names[0]?.name ?? book.id,
    chapter: counts?.length ?? book.chapterCount,
  };
}

/**
 * Parses references such as "John 3:16", "1 Cor 13", "Psalm 23:1-6" or "Gen 1"
 * against the books we actually have, so a typo never silently opens the wrong
 * chapter.
 */
export function parseReference(
  input: string,
  books: BookSummary[],
): ParsedReference | null {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;

  const match = cleaned.match(
    /^([1-3]?\s?[A-Za-z][A-Za-z.]*(?:\s[A-Za-z][A-Za-z.]*)?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/,
  );
  if (!match) return null;

  const [, rawBook, rawChapter, rawVerse, rawEnd] = match;
  const token = normalizeBookToken(rawBook);
  const book =
    books.find((candidate) => normalizeBookToken(candidate.name) === token) ??
    books.find((candidate) => normalizeBookToken(candidate.abbreviation) === token) ??
    books.find((candidate) => normalizeBookToken(candidate.id) === token) ??
    books.find(
      (candidate) => normalizeBookToken(candidate.name).startsWith(token) && token.length > 2,
    );

  if (!book) {
    const alias = ALIASES[token];
    if (!alias) return null;
    const aliased = books.find((candidate) => candidate.id === alias);
    if (!aliased) return null;
    return buildRef(aliased, rawChapter, rawVerse, rawEnd);
  }

  return buildRef(book, rawChapter, rawVerse, rawEnd);
}

function buildRef(
  book: BookSummary,
  rawChapter: string,
  rawVerse?: string,
  rawEnd?: string,
): ParsedReference | null {
  const chapter = Number(rawChapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
    return null;
  }
  const verse = rawVerse ? Number(rawVerse) : undefined;
  const endVerse = rawEnd ? Number(rawEnd) : undefined;
  if (verse !== undefined && (verse < 1 || verse > 200)) return null;
  if (endVerse !== undefined && verse !== undefined && endVerse < verse) return null;

  return { bookId: book.id, bookName: book.name, chapter, verse, endVerse };
}

/** Curated references only — the text itself always comes from the database. */
const DAILY_REFERENCES: { bookId: string; chapter: number; verse: number }[] = [
  { bookId: "Ps", chapter: 119, verse: 105 },
  { bookId: "John", chapter: 3, verse: 16 },
  { bookId: "Isa", chapter: 41, verse: 10 },
  { bookId: "Phil", chapter: 4, verse: 13 },
  { bookId: "Prov", chapter: 3, verse: 5 },
  { bookId: "Matt", chapter: 11, verse: 28 },
  { bookId: "Rom", chapter: 8, verse: 28 },
  { bookId: "Josh", chapter: 1, verse: 9 },
  { bookId: "Ps", chapter: 23, verse: 1 },
  { bookId: "Jer", chapter: 29, verse: 11 },
  { bookId: "2Tim", chapter: 3, verse: 16 },
  { bookId: "Heb", chapter: 11, verse: 1 },
  { bookId: "1Pet", chapter: 5, verse: 7 },
  { bookId: "Gal", chapter: 5, verse: 22 },
  { bookId: "Col", chapter: 3, verse: 23 },
  { bookId: "Ps", chapter: 46, verse: 1 },
  { bookId: "John", chapter: 14, verse: 6 },
  { bookId: "Eph", chapter: 2, verse: 8 },
  { bookId: "1John", chapter: 4, verse: 19 },
  { bookId: "Ps", chapter: 27, verse: 1 },
  { bookId: "Isa", chapter: 40, verse: 31 },
  { bookId: "Matt", chapter: 6, verse: 33 },
  { bookId: "2Cor", chapter: 5, verse: 17 },
  { bookId: "Ps", chapter: 91, verse: 1 },
  { bookId: "James", chapter: 1, verse: 5 },
  { bookId: "1Cor", chapter: 13, verse: 4 },
  { bookId: "Ps", chapter: 34, verse: 8 },
  { bookId: "Zeph", chapter: 3, verse: 17 },
  { bookId: "Mic", chapter: 6, verse: 8 },
  { bookId: "Rev", chapter: 21, verse: 4 },
];

export type DailyVerse = {
  translationId: string;
  translationName: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

export async function getDailyVerse(): Promise<DailyVerse | null> {
  const translation = await db.translation.findFirst({
    where: { verificationStatus: "VERIFIED", isComplete: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!translation) return null;

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const target = DAILY_REFERENCES[dayIndex % DAILY_REFERENCES.length];

  const verse = await getVerse(
    translation.id,
    target.bookId,
    target.chapter,
    target.verse,
  );
  if (!verse) return null;

  const book = await getBook(target.bookId);
  return {
    translationId: translation.id,
    translationName: translation.name,
    bookId: target.bookId,
    bookName: book?.name ?? target.bookId,
    chapter: target.chapter,
    verse: target.verse,
    text: verse.text,
  };
}

export function formatReference(
  bookName: string,
  chapter: number,
  verse?: number,
  endVerse?: number,
) {
  if (!verse) return `${bookName} ${chapter}`;
  if (endVerse) return `${bookName} ${chapter}:${verse}–${endVerse}`;
  return `${bookName} ${chapter}:${verse}`;
}
