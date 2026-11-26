import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PHOTOS } from "@/lib/photos";
import { getQuarterWithLessons } from "@/lib/sabbath";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quarter: string }> };

export async function generateMetadata({ params }: Props) {
  const { quarter: quarterId } = await params;
  const quarter = await getQuarterWithLessons(quarterId);
  return { title: quarter?.title ?? "Sabbath School" };
}

export default async function QuarterPage({ params }: Props) {
  const { quarter: quarterId } = await params;
  const quarter = await getQuarterWithLessons(quarterId);
  if (!quarter) notFound();

  return (
    <div>
      <PageHeader
        eyebrow={`${quarter.quarter}${ordinal(quarter.quarter)} Quarter · ${quarter.year}`}
        title={quarter.title}
        description={`${quarter.humanDate}. All ${quarter.lessons.length} weekly lessons, with official dates and links.`}
        photo={PHOTOS.sabbathSchool}
        actions={
          <a
            href={quarter.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Official guide <ExternalLink className="size-4" aria-hidden />
          </a>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/sabbath-school"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Current quarter
        </Link>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {quarter.description}
        </p>

        <ol className="mt-6 divide-y divide-rule overflow-hidden card border-rule bg-paper">
          {quarter.lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/sabbath-school/${quarter.id}/${String(lesson.number).padStart(2, "0")}`}
                className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-burgundy-tint font-serif text-sm text-burgundy">
                  {String(lesson.number).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink group-hover:text-burgundy">
                    {lesson.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatRange(lesson.startDate, lesson.endDate)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
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
