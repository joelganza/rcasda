/**
 * Bible ingestion.
 *
 * Imports the two public-domain English editions we can verify and legally
 * redistribute: the King James Version (1769) and the World English Bible.
 *
 * The script never fills gaps. It validates book/chapter/verse structure before
 * writing anything, records where the text came from, and fails loudly when the
 * downloaded file is truncated or structurally wrong.
 *
 * Usage: npm run ingest:bible
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { db } from "../lib/db";
import { download } from "./download";

type RawVerse = { number: number; text: string };
type RawChapter = { chapter: number; verses: RawVerse[] };
type RawBook = {
  book: string;
  bookId: number;
  englishName: string;
  testament: "OT" | "NT";
  chapters: RawChapter[];
};
type RawBible = {
  version: string;
  name: string;
  language: string;
  license: string;
  books: RawBook[];
};

type Edition = {
  id: string;
  name: string;
  abbreviation: string;
  year: string;
  copyright: string;
  license: string;
  url: string;
  bytes: number;
  cacheFile: string;
  expectedBooks: number;
  expectedChapters: number;
  expectedVerses: number;
  rightsHolder: string;
};

const CACHE = path.join(process.cwd(), "content", "cache");

const EDITIONS: Edition[] = [
  {
    id: "kjv",
    name: "King James Version",
    abbreviation: "KJV",
    year: "1611 / 1769",
    copyright:
      "Public domain. King James Version (1769 Oxford edition), Crown copyright expired.",
    license: "Public domain",
    url: "https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/kjv/kjv.json",
    bytes: 6_749_364,
    cacheFile: "kjv.json",
    expectedBooks: 66,
    expectedChapters: 1189,
    expectedVerses: 31_102,
    rightsHolder: "Public domain",
  },
  {
    id: "web",
    name: "World English Bible",
    abbreviation: "WEB",
    year: "2000",
    copyright:
      "Public domain. World English Bible, released by Rainbow Missions, Inc. (ebible.org).",
    license: "Public domain",
    url: "https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/web/web.json",
    bytes: 6_649_063,
    cacheFile: "web.json",
    expectedBooks: 66,
    expectedChapters: 1189,
    expectedVerses: 31_098, // WEB follows the critical text and omits 4 later-addition verses
    rightsHolder: "Rainbow Missions, Inc.",
  },
];

async function loadEdition(edition: Edition): Promise<RawBible> {
  const file = path.join(CACHE, edition.cacheFile);
  const existing = await stat(file).catch(() => null);
  if (!existing || existing.size < edition.bytes) {
    await download(edition.url, file, edition.bytes);
  }

  const raw = await readFile(file, "utf8");
  let parsed: RawBible;
  try {
    parsed = JSON.parse(raw) as RawBible;
  } catch {
    throw new Error(
      `${edition.abbreviation}: the cached file is incomplete or corrupt. Delete content/cache/${edition.cacheFile} and re-run.`,
    );
  }

  validate(edition, parsed);
  return parsed;
}

function validate(edition: Edition, bible: RawBible) {
  if (!Array.isArray(bible.books)) {
    throw new Error(`${edition.abbreviation}: source has no books array.`);
  }
  if (bible.books.length !== edition.expectedBooks) {
    throw new Error(
      `${edition.abbreviation}: expected ${edition.expectedBooks} books, found ${bible.books.length}.`,
    );
  }

  const chapters = bible.books.reduce((sum, b) => sum + b.chapters.length, 0);
  const verses = bible.books.reduce(
    (sum, b) => sum + b.chapters.reduce((s, c) => s + c.verses.length, 0),
    0,
  );

  if (chapters !== edition.expectedChapters) {
    throw new Error(
      `${edition.abbreviation}: expected ${edition.expectedChapters} chapters, found ${chapters}.`,
    );
  }
  if (verses !== edition.expectedVerses) {
    throw new Error(
      `${edition.abbreviation}: expected ${edition.expectedVerses} verses, found ${verses}.`,
    );
  }

  const bookIds = new Set<string>();
  const verseIds = new Set<string>();
  let expectedBookOrder = 1;
  for (const book of bible.books) {
    if (
      !book.book ||
      !book.englishName?.trim() ||
      !Number.isInteger(book.bookId) ||
      book.bookId !== expectedBookOrder++ ||
      bookIds.has(book.book)
    ) {
      throw new Error(
        `${edition.abbreviation}: book identity, name, order, or uniqueness is invalid at ${book.book ?? "unknown"}.`,
      );
    }
    bookIds.add(book.book);
    if (book.testament !== "OT" && book.testament !== "NT") {
      throw new Error(`${edition.abbreviation}/${book.book}: invalid testament.`);
    }
    if (!Array.isArray(book.chapters)) {
      throw new Error(`${edition.abbreviation}/${book.book}: invalid chapter list.`);
    }
    if (book.chapters.length === 0) {
      throw new Error(`${edition.abbreviation}/${book.book}: no chapters.`);
    }
    book.chapters.forEach((chapter, index) => {
      if (chapter.chapter !== index + 1) {
        throw new Error(
          `${edition.abbreviation}/${book.book}: chapters are out of order at ${chapter.chapter}.`,
        );
      }
      if (chapter.verses.length === 0) {
        throw new Error(
          `${edition.abbreviation}/${book.book} ${chapter.chapter}: no verses.`,
        );
      }
      let previous = 0;
      chapter.verses.forEach((verse) => {
        // Editions legitimately skip verse numbers (the WEB follows the critical
        // text), so numbers must strictly increase rather than run contiguously.
        if (
          !Number.isInteger(verse.number) ||
          verse.number <= 0 ||
          verse.number <= previous
        ) {
          throw new Error(
            `${edition.abbreviation}/${book.book} ${chapter.chapter}: verses are out of order at ${verse.number}.`,
          );
        }
        previous = verse.number;
        const key = `${book.book}.${chapter.chapter}.${verse.number}`;
        if (verseIds.has(key)) {
          throw new Error(`${edition.abbreviation}: duplicate verse ${key}.`);
        }
        verseIds.add(key);
        if (typeof verse.text !== "string" || !verse.text.trim()) {
          throw new Error(
            `${edition.abbreviation}/${book.book} ${chapter.chapter}:${verse.number}: empty verse text.`,
          );
        }
      });
      if (chapter.verses[0].number !== 1) {
        throw new Error(
          `${edition.abbreviation}/${book.book} ${chapter.chapter}: does not start at verse 1.`,
        );
      }
    });
  }

  console.log(
    `  ${edition.abbreviation}: ${bible.books.length} books, ${chapters} chapters, ${verses} verses — structure OK`,
  );
}

async function main() {
  const source = await db.source.upsert({
    where: { id: "midvash-bible-data" },
    update: { lastVerifiedAt: new Date() },
    create: {
      id: "midvash-bible-data",
      organization: "midvash/bible-data (structured public-domain Bible data)",
      title: "KJV and WEB structured JSON editions",
      sourceUrl: "https://github.com/midvash/bible-data",
      license: "Public domain",
      licenseUrl: "https://github.com/midvash/bible-data",
      permissionNotes:
        "Both editions are public domain. The repository's MIT licence covers its code; the text itself is public domain in the United States.",
      verificationStatus: "VERIFIED",
      lastVerifiedAt: new Date(),
    },
  });

  const loaded: { edition: Edition; bible: RawBible }[] = [];
  for (const edition of EDITIONS) {
    console.log(`Loading ${edition.name}…`);
    loaded.push({ edition, bible: await loadEdition(edition) });
  }

  // Canonical book metadata comes from the KJV, whose 66-book, 1,189-chapter
  // structure is the reference used for navigation in every edition.
  const canonical = loaded[0].bible;
  const bookMeta = new Map<
    string,
    { chapterCount: number; versesPerChapter: number[] }
  >();

  for (const book of canonical.books) {
    const versesPerChapter = book.chapters.map(
      (chapter) => chapter.verses.length,
    );
    bookMeta.set(book.book, {
      chapterCount: book.chapters.length,
      versesPerChapter,
    });

    await db.book.upsert({
      where: { id: book.book },
      update: {
        order: book.bookId,
        testament: book.testament,
        chapterCount: book.chapters.length,
        versesPerChapter: JSON.stringify(versesPerChapter),
      },
      create: {
        id: book.book,
        order: book.bookId,
        testament: book.testament,
        chapterCount: book.chapters.length,
        versesPerChapter: JSON.stringify(versesPerChapter),
      },
    });

    await db.bookName.upsert({
      where: { bookId_languageCode: { bookId: book.book, languageCode: "en" } },
      update: { name: book.englishName, abbreviation: book.book },
      create: {
        bookId: book.book,
        languageCode: "en",
        name: book.englishName,
        abbreviation: book.book,
      },
    });
  }

  console.log(`Canonical books written: ${bookMeta.size}`);

  for (const { edition, bible } of loaded) {
    const chapterCount = bible.books.reduce(
        (sum, b) => sum + b.chapters.length,
        0,
      );

    const verseCount = bible.books.reduce(
        (sum, b) => sum + b.chapters.reduce((s, c) => s + c.verses.length, 0),
        0,
      );

    await db.$transaction(
        async (tx) => {
          // Create or update the translation inside the transaction.
          await tx.translation.upsert({
            where: { id: edition.id },
            update: {
              verseCount,
              chapterCount,
              bookCount: bible.books.length,
              isComplete: false,
              verificationStatus: "PENDING",
            },
            create: {
              id: edition.id,
              name: edition.name,
              abbreviation: edition.abbreviation,
              language: "English",
              languageCode: "en",
              year: edition.year,
              copyright: edition.copyright,
              license: edition.license,
              sourceId: source.id,
              verificationStatus: "PENDING",
              isComplete: false,
              verseCount,
              chapterCount,
              bookCount: bible.books.length,
              availabilityNote: `Complete ${edition.name}. Verified ${bible.books.length} books, ${chapterCount} chapters and ${verseCount} verses against the structured public-domain source.`,
              sortOrder: edition.id === "kjv" ? 1 : 2,
            },
          });

          // Delete old verses only inside the transaction.
          await tx.verse.deleteMany({
            where: { translationId: edition.id },
          });

          let batch: {
            translationId: string;
            bookId: string;
            chapter: number;
            number: number;
            text: string;
          }[] = [];

          const flush = async () => {
            if (batch.length === 0) return;

            await tx.verse.createMany({ data: batch });
            batch = [];
          };

          for (const book of bible.books) {
            for (const chapter of book.chapters) {
              for (const verse of chapter.verses) {
                batch.push({
                  translationId: edition.id,
                  bookId: book.book,
                  chapter: chapter.chapter,
                  number: verse.number,
                  text: verse.text.trim(),
                });

                if (batch.length >= 2000) {
                  await flush();
                }
              }
            }
          }

          await flush();

          // Verify the imported content before committing.
          const written = await tx.verse.count({
            where: { translationId: edition.id },
          });

          if (written !== verseCount) {
            throw new Error(
              `${edition.abbreviation}: wrote ${written} verses but validated ${verseCount}.`,
            );
          }

          // Mark complete only after successful verification.
          await tx.translation.update({
            where: { id: edition.id },
            data: {
              isComplete: true,
              verificationStatus: "VERIFIED",
              lastVerifiedAt: new Date(),
            },
          });

          console.log(
            `  ${edition.abbreviation}: ${written} verses stored and verified.`,
          );
        },
        {
          maxWait: 15000,
          timeout: 180000,
        },
    );
  }

  await db.syncLog.create({
    data: {
      kind: "bible",
      status: "SUCCESS",
      message:
        "Imported King James Version and World English Bible (public domain).",
      detail: JSON.stringify({
        editions: EDITIONS.map((e) => ({
          id: e.id,
          books: e.expectedBooks,
          chapters: e.expectedChapters,
          verses: e.expectedVerses,
        })),
        canonicalBooks: bookMeta.size,
      }),
    },
  });

  console.log("Bible ingestion complete.");
}

main()
  .catch(async (error) => {
    console.error(error);
    await db.syncLog
      .create({
        data: {
          kind: "bible",
          status: "FAILED",
          message: "Bible import failed.",
          detail: (error as Error).message,
        },
      })
      .catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
