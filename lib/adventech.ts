/**
 * Live Sabbath School reader data.
 *
 * Metadata and daily reading content are fetched on demand from the official
 * Adventech JSON API used by absg.adventist.org. The text is not written to the
 * local database: the server proxy only normalises and sanitises the official
 * HTML for display, with attribution and a link back to the source.
 */

const API_BASE = "https://sabbath-school.adventech.io/api/v2";
const OFFICIAL_SITE = "https://absg.adventist.org";
const LANGUAGE = "en";
const TIME_ZONE = "Africa/Kigali";
const CACHE_SECONDS = 900;

const DAY_LABELS = [
  "Sabbath",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const SABBATH_SOURCE = {
  name: "Adult Bible Study Guide · Adventech",
  url: OFFICIAL_SITE,
  api: "https://sabbath-school.adventech.io",
  note:
    "Lesson text © General Conference of Seventh-day Adventists. Fetched live from the official Adventech feed; not stored or edited by this site.",
} as const;

type ApiQuarter = {
  id: string;
  title: string;
  human_date: string;
  start_date: string;
  end_date: string;
  quarterly_group?: { name?: string };
};

type ApiLesson = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
};

type ApiDay = {
  id: string;
  title: string;
  date: string;
};

type ApiQuarterIndex = {
  quarterly: ApiQuarter;
  lessons: ApiLesson[];
};

type ApiLessonIndex = {
  lesson: ApiLesson;
  days: ApiDay[];
};

type ApiDayRead = {
  id: string;
  title: string;
  date: string;
  content: string;
};

export type SabbathDaySummary = {
  id: string;
  label: string;
  date: string;
  title: string;
  isToday: boolean;
};

export type SabbathWeek = {
  quarter: {
    id: string;
    title: string;
    humanDate: string;
  };
  lesson: {
    id: string;
    number: number;
    title: string;
    dateRange: string;
    officialUrl: string;
  };
  days: SabbathDaySummary[];
  todayDayId: string;
  source: typeof SABBATH_SOURCE;
};

export type SabbathDayContent = SabbathDaySummary & {
  contentHtml: string;
  officialUrl: string;
  source: typeof SABBATH_SOURCE;
};

export class SabbathApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SabbathApiError";
  }
}

function parseApiDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) {
    throw new SabbathApiError(`Unrecognised official date: ${value}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function todayInTimeZone(): { date: Date; key: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);

  const year = value("year");
  const month = value("month");
  const day = value("day");

  return {
    date: new Date(Date.UTC(year, month - 1, day)),
    key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function dateKey(value: string): string {
  const date = parseApiDate(value);
  return date.toISOString().slice(0, 10);
}

function formatDay(value: string): string {
  return parseApiDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatRange(start: string, end: string): string {
  const startDate = parseApiDate(start);
  const endDate = parseApiDate(end);
  return `${startDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })} – ${endDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

function standardQuarterId(value: string): boolean {
  return /^\d{4}-(0[1-4])$/.test(value);
}

function chooseQuarter(entries: ApiQuarter[], today: Date): ApiQuarter {
  const standard = entries.filter(
    (entry) =>
      standardQuarterId(entry.id) &&
      (!entry.quarterly_group?.name ||
        /standard adult/i.test(entry.quarterly_group.name)),
  );

  if (standard.length === 0) {
    throw new SabbathApiError("The official feed has no standard adult quarters.");
  }

  const time = today.getTime();
  const containing = standard.find((entry) => {
    const start = parseApiDate(entry.start_date).getTime();
    const end = parseApiDate(entry.end_date).getTime();
    return time >= start && time <= end;
  });

  if (containing) return containing;

  return (
    standard
      .filter((entry) => parseApiDate(entry.start_date).getTime() <= time)
      .sort(
        (a, b) =>
          parseApiDate(b.start_date).getTime() -
          parseApiDate(a.start_date).getTime(),
      )[0] ?? standard[0]
  );
}

function chooseLesson(lessons: ApiLesson[], today: Date): ApiLesson {
  if (lessons.length === 0) {
    throw new SabbathApiError("The official quarter contains no lessons.");
  }

  const time = today.getTime();
  const containing = lessons.find((lesson) => {
    const start = parseApiDate(lesson.start_date).getTime();
    const end = parseApiDate(lesson.end_date).getTime();
    return time >= start && time <= end;
  });

  if (containing) return containing;

  return (
    [...lessons]
      .reverse()
      .find((lesson) => parseApiDate(lesson.start_date).getTime() <= time) ??
    lessons[0]
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}/${LANGUAGE}/${path.replace(/^\/+/, "")}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "RCA-SDA/0.1 (Sabbath School widget)",
    },
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new SabbathApiError(
      `The official Sabbath School feed returned ${response.status}.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new SabbathApiError(
      "The official Sabbath School feed returned an unexpected response.",
    );
  }

  return (await response.json()) as T;
}

export type SabbathSelection = {
  quarterId?: string;
  lessonId?: string;
};

function validateSelection(selection: SabbathSelection): void {
  const { quarterId, lessonId } = selection;
  if (!quarterId && !lessonId) return;
  if (!quarterId || !lessonId) {
    throw new SabbathApiError("Choose both a quarter and a lesson.");
  }
  if (!standardQuarterId(quarterId) || !/^\d{2}$/.test(lessonId)) {
    throw new SabbathApiError("That quarter or lesson is not valid.");
  }
}

export async function getWeek(
  selection: SabbathSelection = {},
): Promise<SabbathWeek> {
  validateSelection(selection);
  const today = todayInTimeZone();

  let index: ApiQuarterIndex;
  if (selection.quarterId) {
    index = await fetchJson<ApiQuarterIndex>(
      `quarterlies/${encodeURIComponent(selection.quarterId)}/index.json`,
    );
  } else {
    const quarterlies = await fetchJson<ApiQuarter[]>("quarterlies/index.json");
    const quarter = chooseQuarter(quarterlies, today.date);
    index = await fetchJson<ApiQuarterIndex>(
      `quarterlies/${encodeURIComponent(quarter.id)}/index.json`,
    );
    if (index.quarterly?.id !== quarter.id) {
      throw new SabbathApiError("The official quarter has an unexpected shape.");
    }
  }

  if (!index.quarterly?.id || !Array.isArray(index.lessons)) {
    throw new SabbathApiError("The official quarter has an unexpected shape.");
  }

  const quarter = index.quarterly;
  const lesson = selection.lessonId
    ? index.lessons.find((entry) => entry.id === selection.lessonId)
    : chooseLesson(index.lessons, today.date);

  if (!lesson) {
    throw new SabbathApiError("That lesson is not part of this quarter.");
  }

  const lessonIndex = await fetchJson<ApiLessonIndex>(
    `quarterlies/${encodeURIComponent(quarter.id)}/lessons/${encodeURIComponent(lesson.id)}/index.json`,
  );

  const days = [...lessonIndex.days]
    .filter((day) => /^0[1-7]$/.test(day.id))
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((day, index) => ({
      id: day.id,
      label: DAY_LABELS[index] ?? day.title,
      date: formatDay(day.date),
      title: day.title,
      isToday: dateKey(day.date) === today.key,
    }));

  if (days.length === 0) {
    throw new SabbathApiError("The official lesson has no daily readings.");
  }

  const todayDayId = days.find((day) => day.isToday)?.id ?? days[0].id;
  const officialUrl = `${OFFICIAL_SITE}/${LANGUAGE}/${quarter.id}/${lesson.id}`;

  return {
    quarter: {
      id: quarter.id,
      title: index.quarterly.title || quarter.title,
      humanDate: quarter.human_date,
    },
    lesson: {
      id: lesson.id,
      number: Number(lesson.id),
      title: lesson.title,
      dateRange: formatRange(lesson.start_date, lesson.end_date),
      officialUrl,
    },
    days,
    todayDayId,
    source: SABBATH_SOURCE,
  };
}

export async function getCurrentWeek(): Promise<SabbathWeek> {
  return getWeek();
}

export async function getDayContent(
  dayId: string,
  selection: SabbathSelection = {},
): Promise<SabbathDayContent> {
  if (!/^0[1-7]$/.test(dayId)) {
    throw new SabbathApiError("That day is not a valid lesson day.");
  }

  const week = await getWeek(selection);
  const summary = week.days.find((day) => day.id === dayId);
  if (!summary) {
    throw new SabbathApiError("That day is not part of this lesson.");
  }

  const payload = await fetchJson<ApiDayRead>(
    `quarterlies/${encodeURIComponent(week.quarter.id)}/lessons/${encodeURIComponent(week.lesson.id)}/days/${encodeURIComponent(dayId)}/read/index.json`,
  );

  if (!payload.content || typeof payload.content !== "string") {
    throw new SabbathApiError("The official feed did not include that reading.");
  }

  return {
    ...summary,
    contentHtml: sanitizeLessonHtml(payload.content),
    officialUrl: week.lesson.officialUrl,
    source: SABBATH_SOURCE,
  };
}

const ALLOWED_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "em",
  "strong",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "hr",
  "a",
  "sup",
  "sub",
  "br",
  "span",
  "div",
]);

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHref(value: string): string {
  try {
    const url = new URL(value, OFFICIAL_SITE);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

/**
 * The official HTML is rendered as rich text. Keep only the semantic tags the
 * lesson actually uses, strip every attribute and drop hidden/script content so
 * remote markup cannot inject styles, handlers or embedded frames into the site.
 */
export function sanitizeLessonHtml(html: string): string {
  let output = String(html).replace(/<!--[\s\S]*?-->/g, "");

  output = output.replace(
    /<\s*(script|style|iframe|object|embed|form|svg|math|template|noscript|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  output = output.replace(
    /<\s*(script|style|iframe|object|embed|form|svg|math|template|noscript|link|meta)\b[^>]*\/?\s*>/gi,
    "",
  );
  output = output.replace(
    /<\s*(div|span|p)\b[^>]*style\s*=\s*(["'])[^"']*display\s*:\s*none[^"']*\2[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );

  output = output.replace(
    /<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi,
    (match, closing: string, rawTag: string, attributes: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return tag === "br" || tag === "hr" ? "" : `</${tag}>`;
      if (tag === "br" || tag === "hr") return `<${tag}>`;

      if (tag === "a") {
        const hrefMatch = attributes.match(
          /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
        );
        const href = safeHref(
          (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim(),
        );
        return href
          ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`
          : "<a>";
      }

      return `<${tag}>`;
    },
  );

  return output.trim();
}