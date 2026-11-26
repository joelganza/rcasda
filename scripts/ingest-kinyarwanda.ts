/**
 * Kinyarwanda Bible ingestion.
 *
 * Source: the Bibiliya Yera PDF supplied by the project owner (Grace Geeks,
 * 2015; also published at abisezerano.com). The PDF has a real text layer.
 *
 * Three chapters are physically damaged in that file: 2 Peter 3, 1 John 1 and
 * 1 John 2. Pages 2941-2944 cannot be decoded; those chapters are supplied from
 * the same Kinyarwanda text at bibiliya.com and are recorded separately. No
 * verse is translated, generated or taken from a different Kinyarwanda edition.
 *
 * Usage:
 *   node scripts/parse-kinyarwanda.mjs        # extract PDF lines
 *   npm run ingest:kinyarwanda -- --report    # validate without writing
 *   npm run ingest:kinyarwanda                # import
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../lib/db";

type PdfLine = {
  page: number;
  y: number;
  font: string;
  size: number;
  text: string;
};

type BookDef = {
  id: string;
  name: string;
  order: number;
  testament: "OT" | "NT";
};

const BOOKS: BookDef[] = [
  { id: "Gen", name: "Itangiriro", order: 1, testament: "OT" },
  { id: "Exod", name: "Kuva", order: 2, testament: "OT" },
  { id: "Lev", name: "Abalewi", order: 3, testament: "OT" },
  { id: "Num", name: "Kubara", order: 4, testament: "OT" },
  { id: "Deut", name: "Gutegeka kwa kabiri", order: 5, testament: "OT" },
  { id: "Josh", name: "Yosuwa", order: 6, testament: "OT" },
  { id: "Judg", name: "Abacamanza", order: 7, testament: "OT" },
  { id: "Ruth", name: "Rusi", order: 8, testament: "OT" },
  { id: "1Sam", name: "1 Samweli", order: 9, testament: "OT" },
  { id: "2Sam", name: "2 Samweli", order: 10, testament: "OT" },
  { id: "1Kgs", name: "1 Abami", order: 11, testament: "OT" },
  { id: "2Kgs", name: "2 Abami", order: 12, testament: "OT" },
  { id: "1Chr", name: "1 Ibyo ku Ngoma", order: 13, testament: "OT" },
  { id: "2Chr", name: "2 Ibyo ku Ngoma", order: 14, testament: "OT" },
  { id: "Ezra", name: "Ezira", order: 15, testament: "OT" },
  { id: "Neh", name: "Nehemiya", order: 16, testament: "OT" },
  { id: "Esth", name: "Esiteri", order: 17, testament: "OT" },
  { id: "Job", name: "Yobu", order: 18, testament: "OT" },
  { id: "Ps", name: "Zaburi", order: 19, testament: "OT" },
  { id: "Prov", name: "Imigani", order: 20, testament: "OT" },
  { id: "Eccl", name: "Umubwiriza", order: 21, testament: "OT" },
  { id: "Song", name: "Indirimbo", order: 22, testament: "OT" },
  { id: "Isa", name: "Yesaya", order: 23, testament: "OT" },
  { id: "Jer", name: "Yeremiya", order: 24, testament: "OT" },
  { id: "Lam", name: "Amaganya", order: 25, testament: "OT" },
  { id: "Ezek", name: "Ezekiyeli", order: 26, testament: "OT" },
  { id: "Dan", name: "Daniyeli", order: 27, testament: "OT" },
  { id: "Hos", name: "Hoseya", order: 28, testament: "OT" },
  { id: "Joel", name: "Yoweli", order: 29, testament: "OT" },
  { id: "Amos", name: "Amosi", order: 30, testament: "OT" },
  { id: "Obad", name: "Obadiya", order: 31, testament: "OT" },
  { id: "Jonah", name: "Yona", order: 32, testament: "OT" },
  { id: "Mic", name: "Mika", order: 33, testament: "OT" },
  { id: "Nah", name: "Nahumu", order: 34, testament: "OT" },
  { id: "Hab", name: "Habakuki", order: 35, testament: "OT" },
  { id: "Zeph", name: "Zefaniya", order: 36, testament: "OT" },
  { id: "Hag", name: "Hagayi", order: 37, testament: "OT" },
  { id: "Zech", name: "Zekariya", order: 38, testament: "OT" },
  { id: "Mal", name: "Malaki", order: 39, testament: "OT" },
  { id: "Matt", name: "Matayo", order: 40, testament: "NT" },
  { id: "Mark", name: "Mariko", order: 41, testament: "NT" },
  { id: "Luke", name: "Luka", order: 42, testament: "NT" },
  { id: "John", name: "Yohana", order: 43, testament: "NT" },
  { id: "Acts", name: "Ibyakozwe n'Intumwa", order: 44, testament: "NT" },
  { id: "Rom", name: "Abaroma", order: 45, testament: "NT" },
  { id: "1Cor", name: "1 Abakorinto", order: 46, testament: "NT" },
  { id: "2Cor", name: "2 Abakorinto", order: 47, testament: "NT" },
  { id: "Gal", name: "Abagalatiya", order: 48, testament: "NT" },
  { id: "Eph", name: "Abefeso", order: 49, testament: "NT" },
  { id: "Phil", name: "Abafilipi", order: 50, testament: "NT" },
  { id: "Col", name: "Abakolosayi", order: 51, testament: "NT" },
  { id: "1Thess", name: "1 Abatesalonike", order: 52, testament: "NT" },
  { id: "2Thess", name: "2 Abatesalonike", order: 53, testament: "NT" },
  { id: "1Tim", name: "1 Timoteyo", order: 54, testament: "NT" },
  { id: "2Tim", name: "2 Timoteyo", order: 55, testament: "NT" },
  { id: "Titus", name: "Tito", order: 56, testament: "NT" },
  { id: "Phlm", name: "Filemoni", order: 57, testament: "NT" },
  { id: "Heb", name: "Abaheburayo", order: 58, testament: "NT" },
  { id: "Jas", name: "Yakobo", order: 59, testament: "NT" },
  { id: "1Pet", name: "1 Petero", order: 60, testament: "NT" },
  { id: "2Pet", name: "2 Petero", order: 61, testament: "NT" },
  { id: "1John", name: "1 Yohana", order: 62, testament: "NT" },
  { id: "2John", name: "2 Yohana", order: 63, testament: "NT" },
  { id: "3John", name: "3 Yohana", order: 64, testament: "NT" },
  { id: "Jude", name: "Yuda", order: 65, testament: "NT" },
  { id: "Rev", name: "Ibyahishuwe", order: 66, testament: "NT" },
];

const EXPECTED_BOOKS = 66;
const EXPECTED_CHAPTERS = 1189;
const EXPECTED_VERSES = 31141;
// Chapter counts follow the supplied Kinyarwanda edition. Joel has 4 chapters
// and Malachi 3; several other books also differ from English verse divisions.
const EXPECTED_CHAPTERS_BY_BOOK = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150,
  31, 12, 8, 66, 52, 5, 48, 12, 14, 4, 9, 1, 4, 7, 3, 3, 3, 2, 14, 3, 28, 16,
  24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1,
  1, 1, 22,
];

const CACHE = path.join(process.cwd(), "content", "cache");
const REPORT_ONLY = process.argv.includes("--report");
const DUMP_ONLY = process.argv.includes("--dump");

// The supplied PDF's pages 2941-2944 are corrupt. They cover 2 Peter 3 and
// 1 John 1-2. The importer replaces those chapters from the supplement below.
const DAMAGED_PAGES = new Set([2941, 2942, 2943, 2944]);

type Verse = { number: number; text: string };
type Chapter = { number: number; verses: Verse[] };
type ParsedBook = { def: BookDef; chapters: Chapter[] };

type Supplement = {
  source: { name: string; url: string; note: string };
  chapters: Record<string, Verse[]>;
};

const REFERENCE_BOOKS = [
  "Itang", "Kuva", "Abal", "Kub", "Guteg", "Yos", "Abac", "Rusi", "Ezira",
  "Neh", "Est", "Yobu", "Zab", "Imig", "Umub", "Ind", "Yes", "Yer",
  "Amag", "Ezek", "Dan", "Hos", "Yow", "Amosi", "Obad", "Yona", "Mika",
  "Nah", "Hab", "Zef", "Hag", "Zek", "Mal", "Mat", "Mar", "Luka",
  "Yoh", "Ibyak", "Rom", "Kor", "Gal", "Ef", "Fil", "Kol", "Kolo",
  "Tes", "Tim", "Tito", "Filem", "Heb", "Yak", "Pet", "Yuda", "Ibyah",
];
const REF_TOKEN = `(?:\\d+\\.\\d+(?:-\\d+)?|(?:[1-3]\\s?)?(?:${REFERENCE_BOOKS.join("|")})\\.?\\s+\\d+(?:\\.\\d+)?(?:-\\d+)?)`;
const REFERENCE_CHAIN = new RegExp(`(?:${REF_TOKEN})(?:\\s*;\\s*${REF_TOKEN})+`, "g");
const SINGLE_REFERENCE = new RegExp(
  `\\b(?:[1-3]\\s?)?(?:${REFERENCE_BOOKS.join("|")})\\.?\\s+\\d+\\.\\d+(?:-\\d+)?`,
  "g",
);

/** Removes the PDF's editorial cross-reference notes from verse text. */
function cleanCrossReferences(value: string) {
  return value
    .replace(REFERENCE_CHAIN, " ")
    .replace(SINGLE_REFERENCE, " ")
    // Trailing fragments such as `16.1--1 Abami 2.11` or `28.1--32.33`
    // are cross-reference notes, not part of the verse.
    .replace(/\s+\d+\.\d+--.*$/, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ");
}

function parseLines(lines: PdfLine[]): ParsedBook[] {
  const byName = new Map(BOOKS.map((book) => [normalizeName(book.name), book]));
  const books: ParsedBook[] = [];
  let currentBook: ParsedBook | null = null;
  let currentChapter: Chapter | null = null;
  let currentVerse: Verse | null = null;

  for (const line of lines) {
    if (DAMAGED_PAGES.has(line.page)) continue;
    const text = line.text.trim();
    if (!text) continue;

    if (line.font === "g_d0_f3" && line.size >= 9 && line.size < 12) {
      const heading = text.match(/^(.+?)\s+(\d{1,3})$/);
      const def = heading ? byName.get(normalizeName(heading[1])) : undefined;
      if (def && heading) {
        const chapterNumber = Number(heading[2]);
        if (!currentBook || currentBook.def.id !== def.id) {
          if (currentBook && def.order !== currentBook.def.order + 1) {
            throw new Error(
              `Book order jumps from ${currentBook.def.name} to ${def.name}.`,
            );
          }
          currentBook = { def, chapters: [] };
          books.push(currentBook);
        }
        const last = currentBook.chapters.at(-1);
        if (!last || last.number !== chapterNumber) {
          currentChapter = { number: chapterNumber, verses: [] };
          currentBook.chapters.push(currentChapter);
          currentVerse = null;
        }
        continue;
      }
    }

    if (!currentBook || !currentChapter) continue;
    if (line.font !== "g_d0_f2" && line.font !== "g_d0_f6") continue;

    // A verse marker is `12.` followed by prose, not `12.4-6` (a cross-reference
    // note that happens to begin at a line break).
    const start = text.match(/^(\d{1,3})\.(?!\d)\s*(.*)$/);
    if (start) {
      const number = Number(start[1]);
      const lastNumber = currentVerse?.number ?? 0;
      if (!currentVerse || number > lastNumber) {
        currentVerse = { number, text: cleanCrossReferences(start[2].trim()) };
        currentChapter.verses.push(currentVerse);
        continue;
      }
      // A repeated or backwards number is not a new verse; keep the line as
      // text so nothing is silently dropped.
    }
    if (currentVerse) {
      currentVerse.text = cleanCrossReferences(
        `${currentVerse.text} ${text}`.replace(/\s+/g, " " ).trim(),
      );
    }
  }

  return books;
}

function applySupplement(books: ParsedBook[], supplement: Supplement) {
  for (const [key, verses] of Object.entries(supplement.chapters)) {
    const [bookId, rawChapter] = key.split(".");
    const chapterNumber = Number(rawChapter);
    const book = books.find((candidate) => candidate.def.id === bookId);
    if (!book) throw new Error(`Supplement book ${bookId} not found.`);
    const existing = book.chapters.find((chapter) => chapter.number === chapterNumber);
    if (existing) {
      existing.verses = verses.map((verse) => ({ ...verse }));
    } else {
      book.chapters.push({
        number: chapterNumber,
        verses: verses.map((verse) => ({ ...verse })),
      });
      book.chapters.sort((a, b) => a.number - b.number);
    }
  }
}

function validate(books: ParsedBook[]) {
  if (books.length !== EXPECTED_BOOKS) {
    const missing = BOOKS.filter(
      (book) => !books.some((candidate) => candidate.def.id === book.id),
    ).map((book) => book.name);
    throw new Error(
      `Expected ${BOOKS.length} books, found ${books.length}. Missing: ${missing.join(", ") || "none"}.`,
    );
  }

  let chapterTotal = 0;
  let verseTotal = 0;
  const issues: string[] = [];

  const foundBooks = new Set<string>();
  for (const [bookIndex, book] of books.entries()) {
    const expectedBook = BOOKS[bookIndex];
    if (!expectedBook || expectedBook.id !== book.def.id || foundBooks.has(book.def.id)) {
      issues.push(`Book order or identity is invalid at ${book.def.id}.`);
    }
    if (book.chapters.length !== EXPECTED_CHAPTERS_BY_BOOK[bookIndex]) {
      issues.push(
        `${book.def.name}: expected ${EXPECTED_CHAPTERS_BY_BOOK[bookIndex]} chapters, found ${book.chapters.length}.`,
      );
    }
    foundBooks.add(book.def.id);
    chapterTotal += book.chapters.length;
    const chapterNumbers = new Set<number>();
    book.chapters.forEach((chapter, index) => {
      if (
        !Number.isInteger(chapter.number) ||
        chapter.number !== index + 1 ||
        chapterNumbers.has(chapter.number)
      ) {
        issues.push(`${book.def.name}: chapter ${chapter.number} is out of order.`);
      }
      chapterNumbers.add(chapter.number);
      if (chapter.verses.length === 0) {
        issues.push(`${book.def.name} ${chapter.number}: no verses.`);
      }
      if (chapter.verses[0] && chapter.verses[0].number !== 1) {
        issues.push(
          `${book.def.name} ${chapter.number}: starts at verse ${chapter.verses[0].number}.`,
        );
      }
      let previous = 0;
      const verseNumbers = new Set<number>();
      for (const verse of chapter.verses) {
        if (
          !Number.isInteger(verse.number) ||
          verse.number < 1 ||
          verse.number <= previous ||
          verseNumbers.has(verse.number)
        ) {
          issues.push(
            `${book.def.name} ${chapter.number}: verse ${verse.number} is out of order.`,
          );
        }
        previous = verse.number;
        verseNumbers.add(verse.number);
        if (
          typeof verse.text !== "string" ||
          !verse.text.trim() ||
          verse.text.includes("\uFFFD") ||
          /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(verse.text)
        ) {
          issues.push(`${book.def.name} ${chapter.number}:${verse.number}: empty text.`);
        }
        verseTotal += 1;
      }
    });
  }

  if (chapterTotal !== EXPECTED_CHAPTERS) {
    issues.push(`Expected ${EXPECTED_CHAPTERS} chapters, found ${chapterTotal}.`);
  }
  if (verseTotal !== EXPECTED_VERSES) {
    issues.push(`Expected ${EXPECTED_VERSES} verses, found ${verseTotal}.`);
  }

  return { chapterTotal, verseTotal, issues };
}

async function report(books: ParsedBook[], issues: string[]) {
  const canonicalPath = path.join(CACHE, "kjv.json");
  const canonicalSource = JSON.parse(await readFile(canonicalPath, "utf8")) as {
    books: { book: string; chapters: { chapter: number; verses: unknown[] }[] }[];
  };
  const canonical = new Map(
    canonicalSource.books.map((book) => [
      book.book,
      book.chapters.map((chapter) => chapter.verses.length),
    ]),
  );
  const mismatches: string[] = [];
  for (const book of books) {
    const expected = canonical.get(book.def.id);
    if (!expected) continue;
    book.chapters.forEach((chapter) => {
      const want = expected[chapter.number - 1];
      if (want !== undefined && want !== chapter.verses.length) {
        mismatches.push(
          `${book.def.name} ${chapter.number}: KJV ${want}, Kinyarwanda ${chapter.verses.length}`,
        );
      }
    });
  }
  console.log(`  Books: ${books.length}`);
  console.log(`  Chapters: ${books.reduce((sum, book) => sum + book.chapters.length, 0)}`);
  console.log(
    `  Verses: ${books.reduce(
      (sum, book) =>
        sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.verses.length, 0),
      0,
    )}`,
  );
  console.log(
    `  Verse-count differences from KJV: ${mismatches.length}${
      mismatches.length ? `\n  ${mismatches.join("\n  ")}` : ""
    }`,
  );
  console.log(
    `  Structural issues: ${issues.length}${
      issues.length ? `\n  ${issues.slice(0, 60).join("\n  ")}` : ""
    }`,
  );
}

async function main() {
  const lines = (await readFile(path.join(CACHE, "kinyarwanda-lines.jsonl"), "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PdfLine);
  const supplement = JSON.parse(
    await readFile(path.join(process.cwd(), "scripts", "kinyarwanda-supplement.json"), "utf8"),
  ) as Supplement;

  const books = parseLines(lines);

  if (DUMP_ONLY) {
    await writeFile(
      path.join(CACHE, "kinyarwanda-parsed.json"),
      `${JSON.stringify(
        books.map((book) => ({
          id: book.def.id,
          name: book.def.name,
          chapters: book.chapters.map((chapter) => ({
            number: chapter.number,
            verses: chapter.verses,
          })),
        })),
        null,
        2,
      )}\n`,
    );
    console.log("Parsed PDF dumped to content/cache/kinyarwanda-parsed.json");
    return;
  }

  applySupplement(books, supplement);
  const totals = validate(books);
  await report(books, totals.issues);

  if (REPORT_ONLY) {
    console.log("Report only — database unchanged.");
    return;
  }

  if (totals.issues.length > 0) {
    throw new Error(`${totals.issues.length} structural issue(s); refusing to import.`);
  }

  const source = await db.source.upsert({
    where: { id: "bibiliya-yera-grace-geeks" },
    update: { verificationStatus: "PENDING", lastVerifiedAt: null },
    create: {
      id: "bibiliya-yera-grace-geeks",
      organization: "Grace Geeks / Bibiliya Yera",
      title: "Bibiliya Yera — Kinyarwanda Bible (supplied PDF)",
      sourceUrl: "https://abisezerano.com/wp-content/uploads/2018/06/bibiliya.pdf",
      license: "Supplied by the project owner; rights not independently verified",
      permissionNotes:
        "The supplied PDF does not contain a licence statement. The project owner supplied the file for this platform. Three chapters damaged in the PDF (2 Peter 3, 1 John 1-2) were taken from the same Kinyarwanda text at bibiliya.com. Verify redistribution rights before public deployment.",
      verificationStatus: "PENDING",
      lastVerifiedAt: null,
    },
  });

  const chapterCount = books.reduce((sum, book) => sum + book.chapters.length, 0);
  const verseCount = totals.verseTotal;
  const availabilityNote =
    "Kinyarwanda text imported from the supplied Bibiliya Yera PDF (Grace Geeks, 2015). Eleven chapters whose pages or verse text were damaged, missing or partial in that file — Ruth 4, Ezra 10, Job 21, Psalm 119, Romans 9, Hebrews 2, 2 Peter 2–3, and 1 John 1, 2 and 4 — were completed from the same text at bibiliya.com. Rights status has not been independently verified; confirm permission before public redistribution.";

  await db.$transaction(async (tx) => {
  await tx.translation.upsert({
    where: { id: "kin" },
    create: {
      id: "kin",
      name: "Bibiliya Yera",
      abbreviation: "BY",
      language: "Ikinyarwanda",
      languageCode: "rw",
      year: "2015",
      copyright: "Grace Geeks / the supplying rights holder.",
      license: "Supplied by the project owner — verify redistribution rights",
      sourceId: source.id,
      verificationStatus: "PENDING",
      isComplete: false,
      verseCount,
      chapterCount,
      bookCount: books.length,
      availabilityNote,
      lastVerifiedAt: new Date(),
      sortOrder: 3,
    },
    update: {
      name: "Bibiliya Yera",
      abbreviation: "BY",
      language: "Ikinyarwanda",
      languageCode: "rw",
      year: "2015",
      copyright: "Grace Geeks / the supplying rights holder.",
      license: "Supplied by the project owner — verify redistribution rights",
      sourceId: source.id,
      verificationStatus: "PENDING",
      isComplete: false,
      verseCount,
      chapterCount,
      bookCount: books.length,
      availabilityNote,
      lastVerifiedAt: new Date(),
      sortOrder: 3,
    },
  });

  for (const book of books) {
    await tx.bookName.upsert({
      where: { bookId_languageCode: { bookId: book.def.id, languageCode: "rw" } },
      update: { name: book.def.name, abbreviation: book.def.name },
      create: {
        bookId: book.def.id,
        languageCode: "rw",
        name: book.def.name,
        abbreviation: book.def.name,
      },
    });
  }

  await tx.verse.deleteMany({ where: { translationId: "kin" } });

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

  for (const book of books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        batch.push({
          translationId: "kin",
          bookId: book.def.id,
          chapter: chapter.number,
          number: verse.number,
          text: cleanCrossReferences(verse.text),
        });
        if (batch.length >= 2000) await flush();
      }
    }
  }
  await flush();

  const written = await tx.verse.count({ where: { translationId: "kin" } });
  if (written !== verseCount) {
    throw new Error(`Wrote ${written} verses but validated ${verseCount}.`);
  }

  // The structural import passed, but the supplied source and supplements have
  // not had every verse independently checked against an authorized edition.
  // Keep it pending until that content review is completed.
  await tx.translation.update({
    where: { id: "kin" },
    data: {
      verificationStatus: "PENDING",
      isComplete: true,
      verseCount: written,
      chapterCount,
      bookCount: books.length,
      lastVerifiedAt: null,
    },
  });
  }, { maxWait: 15000, timeout: 180000 });

  await db.syncLog.create({
    data: {
      kind: "bible",
      status: "SUCCESS",
      message: "Imported Bibiliya Yera (Kinyarwanda) from the supplied PDF.",
      detail: JSON.stringify({
        books: books.length,
        chapters: chapterCount,
        verses: verseCount,
        supplement: supplement.source,
      }),
    },
  });

  console.log(`Imported ${books.length} books, ${chapterCount} chapters, ${verseCount} verses.`);
}

main()
  .catch(async (error) => {
    console.error(error);
    await db.syncLog.create({
      data: {
        kind: "bible",
        status: "FAILED",
        message: "Kinyarwanda Bible import failed.",
        detail: (error as Error).message,
      },
    }).catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
