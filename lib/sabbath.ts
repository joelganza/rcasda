import { db } from "./db";

/**
 * Sabbath School metadata comes from the official Adventech JSON API that the
 * Adult Bible Study Guide site (absg.adventist.org) consumes. Only the metadata
 * — quarter title, lesson titles, dates and official links — is stored here.
 *
 * The lesson text itself is copyright of the General Conference of
 * Seventh-day Adventists. It is never mirrored or summarised as if it were the
 * original; every lesson page links to the official guide.
 */
const API_BASE = "https://sabbath-school.adventech.io/api/v2";
const OFFICIAL_SITE = "https://absg.adventist.org";
const LANGUAGE = "en";
const DAYS = [
  "sabbath",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

const SOURCE_ID = "sabbath-school-official";

type ApiQuarter = {
  id: string;
  title: string;
  human_date: string;
  start_date: string;
  end_date: string;
  quarterly_group?: { name?: string; order?: number };
};

type ApiLesson = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
};

type ApiQuarterIndex = {
  quarterly: ApiQuarter;
  lessons: ApiLesson[];
};

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    throw new Error(`Unrecognised official date: ${value}`);
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid official date: ${value}`);
  }
  return parsed;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "RCA-SDA/0.1 (Sabbath School metadata sync)",
    },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Official Sabbath School API returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

function standardQuarterId(value: string): boolean {
  return /^\d{4}-(0[1-4])$/.test(value);
}

export type QuarterSyncResult = {
  quarterId: string;
  title: string;
  lessons: number;
  officialUrl: string;
};

export async function syncQuarterById(id: string): Promise<QuarterSyncResult> {
  const match = id.match(/^(\d{4})-(0[1-4])$/);
  if (!match) throw new Error(`“${id}” is not a valid quarter identifier.`);

  const year = Number(match[1]);
  const quarterNumber = Number(match[2]);

  const payload = await fetchJson<ApiQuarterIndex>(
    `${API_BASE}/${LANGUAGE}/quarterlies/${id}/index.json`,
  );

  if (payload.quarterly?.id !== id || !Array.isArray(payload.lessons)) {
    throw new Error("The official API returned an unexpected quarter shape.");
  }
  if (payload.lessons.length === 0) {
    throw new Error("The official quarter contains no lessons.");
  }

  const lessonNumbers = payload.lessons.map((lesson) => Number(lesson.id));
  if (
    lessonNumbers.some((number) => !Number.isInteger(number) || number < 1) ||
    new Set(lessonNumbers).size !== lessonNumbers.length ||
    payload.lessons.some(
      (lesson) => !lesson.title?.trim() || !lesson.start_date || !lesson.end_date,
    )
  ) {
    throw new Error("The official quarter contains invalid or duplicate lessons.");
  }

  const quarterUrl = `${OFFICIAL_SITE}/${LANGUAGE}/${id}`;

  await db.source.upsert({
    where: { id: SOURCE_ID },
    create: {
      id: SOURCE_ID,
      organization:
        "General Conference of Seventh-day Adventists — Sabbath School & Personal Ministries",
      title: "Adult Bible Study Guide (official Adventech API)",
      sourceUrl: OFFICIAL_SITE,
      license: "Copyright — link only",
      licenseUrl: "https://absg.adventist.org/about",
      permissionNotes:
        "Quarter and lesson metadata is read from the official Adventech API used by absg.adventist.org. Full lesson text remains on the official site and is not reproduced here.",
      verificationStatus: "VERIFIED",
      lastVerifiedAt: new Date(),
    },
    update: {
      verificationStatus: "VERIFIED",
      lastVerifiedAt: new Date(),
    },
  });

  const description = `The official Adult Bible Study Guide for ${payload.quarterly.human_date}. Lesson text is published by the General Conference of Seventh-day Adventists and linked from this page.`;

  await db.$transaction(async (tx) => {
  await tx.quarter.upsert({
    where: { id },
    create: {
      id,
      year,
      quarter: quarterNumber,
      title: payload.quarterly.title,
      description,
      humanDate: payload.quarterly.human_date,
      startDate: parseDate(payload.quarterly.start_date),
      endDate: parseDate(payload.quarterly.end_date),
      introduction: null,
      sourceId: SOURCE_ID,
      officialUrl: quarterUrl,
      verificationStatus: "VERIFIED",
      contentPermission: "LINK_ONLY",
      lastSyncedAt: new Date(),
    },
    update: {
      title: payload.quarterly.title,
      description,
      humanDate: payload.quarterly.human_date,
      startDate: parseDate(payload.quarterly.start_date),
      endDate: parseDate(payload.quarterly.end_date),
      sourceId: SOURCE_ID,
      officialUrl: quarterUrl,
      verificationStatus: "VERIFIED",
      contentPermission: "LINK_ONLY",
      lastSyncedAt: new Date(),
    },
  });

  for (const lesson of payload.lessons) {
    const number = Number(lesson.id);
    const lessonId = `${id}-${lesson.id}`;
    const lessonUrl = `${quarterUrl}/${lesson.id}`;

    const lessonStart = parseDate(lesson.start_date);
    const lessonEnd = parseDate(lesson.end_date);
    if (lessonEnd < lessonStart) {
      throw new Error(`Lesson ${lesson.id} has an invalid date range.`);
    }

    await tx.lesson.upsert({
      where: { id: lessonId },
      create: {
        id: lessonId,
        quarterId: id,
        number,
        title: lesson.title,
        startDate: lessonStart,
        endDate: lessonEnd,
        memoryVerseRef: null,
        officialUrl: lessonUrl,
        contentPermission: "LINK_ONLY",
        verificationStatus: "VERIFIED",
      },
      update: {
        quarterId: id,
        number,
        title: lesson.title,
        startDate: lessonStart,
        endDate: lessonEnd,
        officialUrl: lessonUrl,
        contentPermission: "LINK_ONLY",
        verificationStatus: "VERIFIED",
      },
    });

    for (const [index, day] of DAYS.entries()) {
      await tx.lessonDay.upsert({
        where: { lessonId_index: { lessonId, index } },
        create: {
          lessonId,
          index,
          day,
          title: null,
          body: null,
          referenceRefs: null,
          officialUrl: lessonUrl,
        },
        update: {
          day,
          officialUrl: lessonUrl,
        },
      });
    }
  }

  // Keep previously imported lessons if an upstream index temporarily omits
  // them. They can be reviewed and pruned deliberately in a later audit.
  await tx.syncLog.create({
    data: {
      kind: "sabbath-school",
      status: "SUCCESS",
      message: `Synced ${payload.quarterly.title} (${payload.quarterly.human_date}) metadata.`,
      detail: JSON.stringify({
        quarterId: id,
        lessons: payload.lessons.length,
        permission: "LINK_ONLY",
      }),
    },
  });
  }, { maxWait: 15000, timeout: 60000 });

  return {
    quarterId: id,
    title: payload.quarterly.title,
    lessons: payload.lessons.length,
    officialUrl: quarterUrl,
  };
}

/**
 * Picks the quarter that contains today's date from the official index, falling
 * back to the most recent published quarter. This is what lets the dashboard
 * roll over automatically when a new guide appears.
 */
export async function syncCurrentQuarter(): Promise<QuarterSyncResult> {
  const index = await fetchJson<ApiQuarter[]>(
    `${API_BASE}/${LANGUAGE}/quarterlies/index.json`,
  );

  const standard = index.filter(
    (entry) =>
      standardQuarterId(entry.id) &&
      (!entry.quarterly_group?.name ||
        /standard adult/i.test(entry.quarterly_group.name)),
  );

  if (standard.length === 0) {
    throw new Error("The official API returned no standard adult quarters.");
  }

  const today = Date.now();
  const containing = standard.find((entry) => {
    const start = parseDate(entry.start_date).getTime();
    const end = parseDate(entry.end_date).getTime();
    return today >= start && today <= end;
  });

  const chosen =
    containing ??
    standard
      .filter((entry) => parseDate(entry.start_date).getTime() <= today)
      .sort(
        (a, b) => parseDate(b.start_date).getTime() - parseDate(a.start_date).getTime(),
      )[0] ??
    standard[0];

  return syncQuarterById(chosen.id);
}

export async function getQuarterWithLessons(id: string) {
  return db.quarter.findUnique({
    where: { id },
    include: {
      source: true,
      lessons: { orderBy: { number: "asc" } },
    },
  });
}

export async function getLesson(quarterId: string, lessonNumber: number) {
  return db.lesson.findUnique({
    where: { quarterId_number: { quarterId, number: lessonNumber } },
    include: {
      quarter: { include: { source: true } },
      days: { orderBy: { index: "asc" } },
    },
  });
}

export async function getLessonNeighbours(quarterId: string, lessonNumber: number) {
  const [previous, next] = await Promise.all([
    db.lesson.findFirst({
      where: { quarterId, number: { lt: lessonNumber } },
      orderBy: { number: "desc" },
      select: { number: true, title: true },
    }),
    db.lesson.findFirst({
      where: { quarterId, number: { gt: lessonNumber } },
      orderBy: { number: "asc" },
      select: { number: true, title: true },
    }),
  ]);
  return { previous, next };
}
