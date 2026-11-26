import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { LessonTools } from "@/components/sabbath/lesson-tools";
import { SabbathSchoolWidget } from "@/components/sabbath/sabbath-widget";
import { getLesson, getLessonNeighbours } from "@/lib/sabbath";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quarter: string; lesson: string }> };

export async function generateMetadata({ params }: Props) {
  const { quarter: quarterId, lesson: rawLesson } = await params;
  const lesson = await getLesson(quarterId, Number(rawLesson));
  return {
    title: lesson ? `Lesson ${lesson.number}: ${lesson.title}` : "Sabbath School",
  };
}

export default async function LessonPage({ params }: Props) {
  const { quarter: quarterId, lesson: rawLesson } = await params;
  const lessonNumber = Number(rawLesson);
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1) notFound();

  const lesson = await getLesson(quarterId, lessonNumber);
  if (!lesson) notFound();
  const neighbours = await getLessonNeighbours(quarterId, lessonNumber);

  return (
    <div>
      <PageHeader
        eyebrow={`${lesson.quarter.title} · Lesson ${lesson.number}`}
        title={lesson.title}
        description={formatRange(lesson.startDate, lesson.endDate)}
        actions={
          <a
            href={lesson.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Official lesson <ExternalLink className="size-4" aria-hidden />
          </a>
        }
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.5fr_0.5fr]">
        <div>
          <Link
            href={`/sabbath-school/${quarterId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {lesson.quarter.title}
          </Link>

          <div className="mt-5">
            <SabbathSchoolWidget
              quarterId={quarterId}
              lessonId={String(lesson.number).padStart(2, "0")}
              showHeader={false}
            />
          </div>

          <div className="mt-5">
            <LessonTools
              lessonId={lesson.id}
              quarterId={quarterId}
              lessonNumber={lesson.number}
              lessonTitle={lesson.title}
              quarterTitle={lesson.quarter.title}
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-5">
            {neighbours.previous ? (
              <Link
                href={`/sabbath-school/${quarterId}/${String(neighbours.previous.number).padStart(2, "0")}`}
                className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
              >
                <ArrowLeft className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">
                  Lesson {neighbours.previous.number}: {neighbours.previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {neighbours.next ? (
              <Link
                href={`/sabbath-school/${quarterId}/${String(neighbours.next.number).padStart(2, "0")}`}
                className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
              >
                <span className="min-w-0 truncate">
                  Lesson {neighbours.next.number}: {neighbours.next.title}
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card border-rule bg-paper p-5">
            <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
              Quarter
            </p>
            <p className="mt-1 font-serif text-lg text-ink">{lesson.quarter.title}</p>
            <p className="text-sm text-muted">{lesson.quarter.humanDate}</p>
            <dl className="mt-4 space-y-3 border-t border-rule pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Lesson dates</dt>
                <dd className="mt-0.5 text-ink-soft">
                  {formatRange(lesson.startDate, lesson.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Memory verse</dt>
                <dd className="mt-0.5 text-ink-soft">
                  {lesson.memoryVerseRef ??
                    "See the official lesson for the memory text."}
                </dd>
              </div>
            </dl>
          </div>
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
