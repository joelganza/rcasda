import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/page-header";
import { SabbathSchoolWidget } from "@/components/sabbath/sabbath-widget";
import { getCurrentQuarter, listQuarters } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";
import { PHOTOS } from "@/lib/photos";
import { getQuarterWithLessons } from "@/lib/sabbath";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sabbath School",
  description:
    "Read the current official Adult Bible Study Guide, with the week’s daily readings, dates and links to the official publication.",
};

export default async function SabbathSchoolPage() {
  const unavailable = { unavailable: true } as const;
  const currentResult = await safeDb(getCurrentQuarter, unavailable);
  const quartersResult = await safeDb(listQuarters, unavailable);
  const current = currentResult === unavailable ? null : currentResult as Awaited<ReturnType<typeof getCurrentQuarter>>;
  const quarterResult = current ? await safeDb(() => getQuarterWithLessons(current.id), unavailable) : null;
  const quarter = quarterResult === unavailable ? null : quarterResult as NonNullable<Awaited<ReturnType<typeof getQuarterWithLessons>>>;
  const quarters = quartersResult === unavailable ? [] : quartersResult as Awaited<ReturnType<typeof listQuarters>>;
  const failed = currentResult === unavailable || quartersResult === unavailable || quarterResult === unavailable;

  if (!quarter && failed) {
    return <div><PageHeader eyebrow="Study" title="Sabbath School" /><div className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><EmptyState title="Data temporarily unavailable"><p>Please try again shortly.</p></EmptyState></div></div>;
  }
  if (!quarter) {
    return (
      <div>
        <PageHeader eyebrow="Study" title="Sabbath School" />
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <EmptyState title="No lesson available yet">
            <p>The current quarter will appear here when it is published.</p>
          </EmptyState>
        </div>
      </div>
    );
  }

  const currentLesson =
    quarter.lessons.find(
      (lesson) =>
        Date.now() >= lesson.startDate.getTime() &&
        Date.now() <= lesson.endDate.getTime() + 86_400_000,
    ) ?? quarter.lessons[0];
  const others = quarters.filter((entry) => entry.id !== quarter.id).slice(0, 4);

  return (
    <div>
      <PageHeader
        eyebrow={`${quarter.quarter}${ordinal(quarter.quarter)} Quarter · ${quarter.year}`}
        title={quarter.title}
        description={`${quarter.humanDate}. All ${quarter.lessons.length} lessons, with dates and official links.`}
        photo={PHOTOS.sabbathSchool}
        actions={
          <a
            href={quarter.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Open the official guide
            <ExternalLink className="size-4" aria-hidden />
          </a>
        }
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="min-w-0">
          <SabbathSchoolWidget />

          <section className="reveal mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-ink">Weekly lessons</h2>
              <span className="text-xs tabular-nums text-muted">
                {quarter.lessons.length} lessons
              </span>
            </div>
            <ol className="stagger divide-y divide-rule card border-rule bg-paper">
              {quarter.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLesson?.id;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/sabbath-school/${quarter.id}/${String(lesson.number).padStart(2, "0")}`}
                      className={`group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface ${
                        isCurrent ? "bg-burgundy-tint/50" : ""
                      }`}
                    >
                      <span
                        className={`w-7 shrink-0 text-right text-sm tabular-nums ${
                          isCurrent ? "text-burgundy" : "text-muted"
                        }`}
                      >
                        {String(lesson.number).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            isCurrent ? "font-medium text-burgundy" : "text-ink"
                          }`}
                        >
                          {lesson.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {formatRange(lesson.startDate, lesson.endDate)}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-3.5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="reveal min-w-0 space-y-4">
          <div className="card border-rule bg-paper p-5">
            <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
              About this quarter
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {quarter.description}
            </p>
            <dl className="mt-4 border-t border-rule pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Published</dt>
                <dd className="mt-0.5 text-ink-soft">
                  {formatDate(quarter.startDate)} – {formatDate(quarter.endDate)}
                </dd>
              </div>
            </dl>
          </div>

          {others.length > 0 ? (
            <div className="card border-rule bg-paper p-5">
              <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
                Other quarters
              </p>
              <ul className="mt-2 divide-y divide-rule">
                {others.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/sabbath-school/${entry.id}`}
                      className="flex items-baseline justify-between gap-2 py-2 text-sm text-ink-soft hover:text-burgundy"
                    >
                      <span className="min-w-0 truncate">{entry.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {entry.quarter}/{entry.year}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(start: Date, end: Date) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function ordinal(value: number) {
  return value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
}
