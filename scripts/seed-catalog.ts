/**
 * Catalogue seed: the optional Kinyarwanda placeholder, reading plans and the
 * source records that the transparency page reads.
 *
 * If the supplied Bibiliya Yera PDF has not been imported yet, the Kinyarwanda
 * row stays UNAVAILABLE. No Kinyarwanda Scripture is generated here; run
 * `npm run ingest:kinyarwanda` to import the supplied text.
 *
 * Usage: npm run seed:catalog
 */
import { db } from "../lib/db";

const BIBLE_SOURCE_ID = "bible-society-rwanda";

async function seedKinyarwanda() {
  const existing = await db.translation.findUnique({ where: { id: "kin" } });
  if (existing?.isComplete && existing.verseCount > 0) {
    console.log("Kinyarwanda Bible already imported; leaving it untouched.");
    return;
  }

  await db.source.upsert({
    where: { id: BIBLE_SOURCE_ID },
    create: {
      id: BIBLE_SOURCE_ID,
      organization: "Bible Society of Rwanda and the licensing publisher",
      title: "Authorised Kinyarwanda Bible",
      license: "Copyright — written permission required",
      permissionNotes:
        "No authorised Kinyarwanda text or API access has been supplied. The edition is listed as unavailable rather than filled with a translation or a similar-language text.",
      verificationStatus: "UNAVAILABLE",
      lastVerifiedAt: new Date(),
    },
    update: { lastVerifiedAt: new Date() },
  });

  await db.translation.upsert({
    where: { id: "kin" },
    create: {
      id: "kin",
      name: "Kinyarwanda Bible",
      abbreviation: "KIN",
      language: "Ikinyarwanda",
      languageCode: "rw",
      year: null,
      copyright:
        "Rights held by the Bible Society of Rwanda / the licensing publisher.",
      license: "Copyright — permission required",
      sourceId: BIBLE_SOURCE_ID,
      verificationStatus: "UNAVAILABLE",
      isComplete: false,
      verseCount: 0,
      chapterCount: 0,
      bookCount: 0,
      availabilityNote:
        "The supplied Kinyarwanda Bibiliya Yera has not been imported on this installation. Place bibiliya.pdf at the project root and run npm run ingest:kinyarwanda; no Scripture is generated, machine-translated or substituted.",
      lastVerifiedAt: new Date(),
      sortOrder: 3,
    },
    update: {
      verificationStatus: "UNAVAILABLE",
      availabilityNote:
        "The supplied Kinyarwanda Bibiliya Yera has not been imported on this installation. Place bibiliya.pdf at the project root and run npm run ingest:kinyarwanda; no Scripture is generated, machine-translated or substituted.",
      lastVerifiedAt: new Date(),
    },
  });

  console.log("Kinyarwanda Bible recorded as UNAVAILABLE (no text invented).");
}

type ChapterRef = { bookId: string; bookName: string; chapters: number };

async function bookChapters(): Promise<ChapterRef[]> {
  const books = await db.book.findMany({
    orderBy: { order: "asc" },
    include: { names: { where: { languageCode: "en" } } },
  });
  return books.map((book) => ({
    bookId: book.id,
    bookName: book.names[0]?.name ?? book.id,
    chapters: book.chapterCount,
  }));
}

/** Splits a list of chapters into `days` roughly equal reading portions. */
function schedule(
  books: ChapterRef[],
  days: number,
  filter?: (book: ChapterRef) => boolean,
): { passages: string[] }[] {
  const chapters: { bookName: string; chapter: number }[] = [];
  for (const book of books.filter(filter ?? (() => true))) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      chapters.push({ bookName: book.bookName, chapter });
    }
  }

  const result: { passages: string[] }[] = [];
  let cursor = 0;

  for (let day = 0; day < days; day += 1) {
    const remainingDays = days - day;
    const remainingChapters = chapters.length - cursor;
    const take = Math.max(1, Math.round(remainingChapters / remainingDays));
    const slice = chapters.slice(cursor, cursor + take);
    cursor += take;

    const passages: string[] = [];
    let start: { bookName: string; chapter: number } | null = null;
    let previous: { bookName: string; chapter: number } | null = null;

    for (const chapter of slice) {
      if (!start) {
        start = chapter;
        previous = chapter;
        continue;
      }
      if (
        previous &&
        chapter.bookName === previous.bookName &&
        chapter.chapter === previous.chapter + 1
      ) {
        previous = chapter;
        continue;
      }
      if (start && previous) {
        passages.push(
          start.chapter === previous.chapter
            ? `${start.bookName} ${start.chapter}`
            : `${start.bookName} ${start.chapter}–${previous.chapter}`,
        );
      }
      start = chapter;
      previous = chapter;
    }
    if (start && previous) {
      passages.push(
        start.chapter === previous.chapter
          ? `${start.bookName} ${start.chapter}`
          : `${start.bookName} ${start.chapter}–${previous.chapter}`,
      );
    }

    result.push({ passages });
  }

  return result;
}

async function seedPlans() {
  const books = await bookChapters();

  const ntBookIds = new Set([
    "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph",
    "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb",
    "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev",
  ]);

  const plans = [
    {
      id: "plan-whole-bible",
      slug: "whole-bible-in-a-year",
      title: "The whole Bible in a year",
      description:
        "Read every chapter of Scripture in canonical order, roughly four chapters a day. The schedule follows the 66-book canon in this library.",
      days: 365,
      schedule: schedule(books, 365),
    },
    {
      id: "plan-new-testament",
      slug: "new-testament-in-90-days",
      title: "The New Testament in 90 days",
      description:
        "Matthew to Revelation in ninety days, about three chapters a day. A focused way to walk through the life of Christ and the early church.",
      days: 90,
      schedule: schedule(books, 90, (book) => ntBookIds.has(book.bookId)),
    },
    {
      id: "plan-psalms",
      slug: "psalms-in-30-days",
      title: "Psalms in 30 days",
      description:
        "Five psalms a day for a month of prayer, lament and praise. The psalms are read in their canonical order.",
      days: 30,
      schedule: schedule(books, 30, (book) => book.bookId === "Ps"),
    },
  ];

  for (const plan of plans) {
    await db.readingPlan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        slug: plan.slug,
        title: plan.title,
        description: plan.description,
        days: plan.days,
        languageCode: "en",
      },
      update: {
        slug: plan.slug,
        title: plan.title,
        description: plan.description,
        days: plan.days,
      },
    });

    await db.readingPlanDay.deleteMany({ where: { planId: plan.id } });

    const items = plan.schedule
      .map((entry, index) => ({
        planId: plan.id,
        day: index + 1,
        title: `Day ${index + 1}`,
        passages: JSON.stringify(entry.passages),
      }))
      .filter((entry) => JSON.parse(entry.passages).length > 0);

    await db.readingPlanDay.createMany({ data: items });
    console.log(`  ${plan.title}: ${items.length} days.`);
  }
}

async function main() {
  await seedKinyarwanda();
  await seedPlans();

  await db.syncLog.create({
    data: {
      kind: "admin",
      status: "SUCCESS",
      message: "Seeded the catalogue: Kinyarwanda placeholder and reading plans.",
      detail: JSON.stringify({ plans: 3 }),
    },
  });

  console.log("Catalogue seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
