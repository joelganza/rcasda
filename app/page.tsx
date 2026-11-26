import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Music4,
  NotebookPen,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ContinueReadingCard, RecentHymns } from "@/components/home/home-personal";
import { SectionTitle } from "@/components/page-header";
import { getBooks, getDailyVerse } from "@/lib/bible";
import { getCurrentQuarter, listTranslations } from "@/lib/content";
import { getFeaturedHymns } from "@/lib/hymns";
import { PHOTOS, type Photo } from "@/lib/photos";
import { getQuarterWithLessons } from "@/lib/sabbath";
import { safeDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

const QUICK_BOOKS = ["Gen", "Ps", "Prov", "Isa", "Matt", "John", "Rom", "Rev"];

export default async function Home() {
  const unavailable = { unavailable: true } as const;
  const [translationResult, verseResult, quarterResult, featuredResult, booksResult] =
    await Promise.all([
      safeDb(listTranslations, unavailable),
      safeDb(getDailyVerse, unavailable),
      safeDb(getCurrentQuarter, unavailable),
      safeDb(() => getFeaturedHymns(4), unavailable),
      safeDb(() => getBooks("en"), unavailable),
    ]);
  const failed = [translationResult, verseResult, quarterResult, featuredResult, booksResult].includes(unavailable);
  const translations = translationResult === unavailable ? [] : translationResult as Awaited<ReturnType<typeof listTranslations>>;
  const dailyVerse = verseResult === unavailable ? null : verseResult as Awaited<ReturnType<typeof getDailyVerse>>;
  const currentQuarter = quarterResult === unavailable ? null : quarterResult as Awaited<ReturnType<typeof getCurrentQuarter>>;
  const featured = featuredResult === unavailable ? { collection: null, hymns: [] } : featuredResult as Awaited<ReturnType<typeof getFeaturedHymns>>;
  const books = booksResult === unavailable ? [] : booksResult as Awaited<ReturnType<typeof getBooks>>;
  let quarterUnavailable = false;

  const quarterResultData = currentQuarter
      ? await safeDb(() => getQuarterWithLessons(currentQuarter.id), unavailable)
    : null;
  if (quarterResultData === unavailable) quarterUnavailable = true;
  const quarter = quarterResultData === unavailable ? null : quarterResultData as Awaited<ReturnType<typeof getQuarterWithLessons>>;
  const english = translations.find(
    (translation) => translation.verificationStatus === "VERIFIED",
  );
  const currentLesson =
    quarter?.lessons.find(
      (lesson) =>
        Date.now() >= lesson.startDate.getTime() &&
        Date.now() <= lesson.endDate.getTime() + 86_400_000,
    ) ?? quarter?.lessons[0];
  const quickBooks = QUICK_BOOKS.map((id) => books.find((book) => book.id === id)).filter(
    (book): book is NonNullable<typeof book> => Boolean(book),
  );

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-[#15110e]">
        <Image
          src={PHOTOS.hero.src}
          alt={PHOTOS.hero.alt}
          fill
          priority
          sizes="100vw"
          className="hero-image object-cover"
          style={{ objectPosition: PHOTOS.hero.position }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,17,14,0.97)_0%,rgba(21,17,14,0.88)_42%,rgba(21,17,14,0.36)_74%,rgba(21,17,14,0.18)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#15110e] via-transparent to-transparent opacity-70"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-medium tracking-[0.12em] text-[#d8b774] uppercase">
              RCA Seventh-day Adventist community
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-[2.15rem] leading-[1.06] tracking-[-0.02em] text-[#faf5ea] sm:text-[3.3rem] md:text-[3.9rem]">
              Grow in the Word.
              <br />
              Worship in Spirit.
            </h1>
            <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-[#ded4c4]">
              Scripture, hymnody and Sabbath School study in one quiet place — for
              personal devotion, family worship and preparation for Sabbath.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={english ? `/bible/${english.id}` : "/bible"}
                className="group inline-flex items-center gap-3 rounded-lg bg-[#f3e8d4] py-2.5 pr-2.5 pl-5 text-sm font-medium text-[#2a211a] transition-colors hover:bg-white"
              >
                Open the Bible
                <span className="flex size-7 items-center justify-center rounded-md bg-[#2a211a]/10">
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
              <Link
                href="/hymnal"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-medium text-[#faf5ea] transition-colors hover:border-[#d8b774] hover:text-[#d8b774]"
              >
                Explore the hymnal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        {failed || quarterUnavailable ? (
          <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            Some content is temporarily unavailable because the database can’t be reached. Please try again shortly.
          </p>
        ) : null}
        <div className="stagger grid gap-4 sm:grid-cols-2">
          <ResourceCard
            icon={<BookOpen className="size-4" aria-hidden />}
            label="Bible"
            title="Read and explore God’s Word"
            description="The KJV, WEB and the supplied Kinyarwanda Bible."
            href="/bible"
            cta="Open the Bible"
            photo={PHOTOS.bible}
          />
          <ResourceCard
            icon={<Music4 className="size-4" aria-hidden />}
            label="Hymnal"
            title="Hymns for worship and praise"
            description={
              featured.collection
                ? `${featured.collection.hymnCount.toLocaleString()} classic hymns and 500 Kinyarwanda hymns.`
                : "Classic hymns and the 500-hymn Kinyarwanda hymnal."
            }
            href="/hymnal"
            cta="Explore the hymnal"
            photo={PHOTOS.hymnal}
          />
          <ResourceCard
            icon={<NotebookPen className="size-4" aria-hidden />}
            label="Sabbath School"
            title="Study the current lesson"
            description={
              quarter
                ? `${quarter.title} · ${quarter.humanDate}.`
                : "The current Adult Bible Study Guide."
            }
            href="/sabbath-school"
            cta="Study lessons"
            photo={PHOTOS.sabbathSchool}
          />
          <ContinueReadingCard />
        </div>

        <section className="reveal mt-14 grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <div className="card card-accent relative overflow-hidden border-rule bg-parchment p-6 md:p-8">
            <div className="quote-mark" aria-hidden>
              “
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-medium tracking-[0.1em] text-burgundy uppercase">
                Verse for today
              </p>
              {dailyVerse ? (
                <span className="text-[0.7rem] font-medium text-muted">
                  {dailyVerse.translationName}
                </span>
              ) : null}
            </div>
            {dailyVerse ? (
              <>
                <blockquote className="scripture mt-4 max-w-2xl text-[1.35rem] leading-[1.7]">
                  “{dailyVerse.text}”
                </blockquote>
                <Link
                  href={`/bible/${dailyVerse.translationId}/${dailyVerse.bookId}/${dailyVerse.chapter}#v${dailyVerse.verse}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy hover:underline"
                >
                  {dailyVerse.bookName} {dailyVerse.chapter}:{dailyVerse.verse}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">Today’s verse is unavailable.</p>
            )}
          </div>

          <div className="card border-rule bg-paper p-6">
            <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
              Recently opened hymns
            </p>
            <div className="mt-3">
              <RecentHymns />
            </div>
            <Link
              href="/hymnal"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
            >
              All hymns <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        {quarter && currentLesson ? (
          <section className="reveal mt-14">
            <SectionTitle
              title="Current Sabbath School lesson"
              description={`${quarter.title} · ${quarter.humanDate}`}
              action={
                <Link
                  href={`/sabbath-school/${quarter.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
                >
                  All lessons <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            />
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <Link
                href={`/sabbath-school/${quarter.id}/${String(currentLesson.number).padStart(2, "0")}`}
                className="group card card-accent border-rule bg-paper p-6 hover:border-burgundy"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.08em] text-burgundy uppercase">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Lesson {currentLesson.number}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-2xl leading-snug text-ink group-hover:text-burgundy">
                  {currentLesson.title}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {formatRange(currentLesson.startDate, currentLesson.endDate)}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  Read the official guide, then track each day here.
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy">
                  Open lesson
                  <ArrowRight
                    className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </Link>

              <div className="card border-rule bg-parchment p-6">
                <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
                  This quarter
                </p>
                <ul className="mt-3 divide-y divide-rule">
                  {quarter.lessons.slice(0, 4).map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/sabbath-school/${quarter.id}/${String(lesson.number).padStart(2, "0")}`}
                        className="flex items-baseline justify-between gap-3 py-2 text-sm text-ink-soft transition-colors hover:text-burgundy"
                      >
                        <span className="min-w-0 truncate">
                          {String(lesson.number).padStart(2, "0")} · {lesson.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          {lesson.startDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/sabbath-school/${quarter.id}`}
                  className="mt-3 inline-flex text-xs text-burgundy hover:underline"
                >
                  View all {quarter.lessons.length} lessons
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="reveal mt-14">
          <SectionTitle
            title="Quick access"
            description="Jump straight to a book, or search the whole platform."
            action={
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
              >
                <Search className="size-3.5" aria-hidden />
                Search
              </Link>
            }
          />
          <div className="flex flex-wrap gap-2">
            {quickBooks.map((book) => (
              <Link
                key={book.id}
                href={
                  english
                    ? `/bible/${english.id}/${book.id}/1`
                    : `/bible`
                }
                className="rounded-lg border border-rule bg-paper px-3.5 py-2 text-sm text-ink-soft transition-colors hover:border-burgundy hover:text-burgundy"
              >
                {book.name}
              </Link>
            ))}
            <Link
              href={english ? `/bible/${english.id}` : "/bible"}
              className="rounded-lg border border-dashed border-rule-strong px-3.5 py-2 text-sm text-muted transition-colors hover:border-burgundy hover:text-burgundy"
            >
              All 66 books
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResourceCard({
  icon,
  label,
  title,
  description,
  href,
  cta,
  photo,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  photo: Photo;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden card border-rule bg-paper hover:border-burgundy"
    >
      <div className="card-media relative aspect-[16/10] overflow-hidden bg-surface">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
          style={photo.position ? { objectPosition: photo.position } : undefined}
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-center gap-2 text-burgundy">
            {icon}
            <p className="text-[0.68rem] font-medium tracking-[0.1em] uppercase">
              {label}
            </p>
          </div>
          <h2 className="mt-2 font-serif text-xl leading-snug text-ink transition-colors duration-300 group-hover:text-burgundy">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy">
          {cta}
          <ArrowRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}

function formatRange(start: Date, end: Date) {
  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${format(start)} – ${format(end)}`;
}
