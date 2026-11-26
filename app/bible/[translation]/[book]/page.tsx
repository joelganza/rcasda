import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getBook, getBooks } from "@/lib/bible";
import { getTranslation, listTranslations } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ translation: string; book: string }> };

export async function generateMetadata({ params }: Props) {
  const { book } = await params;
  return { title: book };
}

export default async function BookOverviewPage({ params }: Props) {
  const { translation: translationId, book: bookId } = await params;
  const unavailable = { unavailable: true } as const;
  const translationResult = await safeDb(() => getTranslation(translationId), unavailable);
  if (translationResult === unavailable) return <Unavailable />;
  const translation = translationResult as NonNullable<Awaited<ReturnType<typeof getTranslation>>>;
  if (!translation) notFound();

  const [bookResult, booksResult, translationsResult] = await Promise.all([
    safeDb(() => getBook(bookId, translation.languageCode, translation.id), unavailable),
    safeDb(() => getBooks(translation.languageCode, translation.id), unavailable),
    safeDb(listTranslations, unavailable),
  ]);
  if (bookResult === unavailable || booksResult === unavailable || translationsResult === unavailable) return <Unavailable />;
  const book = bookResult as Awaited<ReturnType<typeof getBook>>;
  const books = booksResult as Awaited<ReturnType<typeof getBooks>>;
  const translations = translationsResult as Awaited<ReturnType<typeof listTranslations>>;

  if (!book) notFound();
  if (translation.verificationStatus === "UNAVAILABLE" || translation.verseCount === 0) {
    redirect(`/bible/${translation.id}`);
  }

  const index = books.findIndex((candidate) => candidate.id === book.id);
  const previous = index > 0 ? books[index - 1] : null;
  const next = index >= 0 && index < books.length - 1 ? books[index + 1] : null;
  const otherEditions = translations.filter(
    (candidate) =>
      candidate.verificationStatus === "VERIFIED" && candidate.id !== translation.id,
  );

  return (
    <div>
      <PageHeader
        eyebrow={`${translation.abbreviation} · ${book.testament === "OT" ? "Old Testament" : "New Testament"}`}
        title={book.name}
        description={`${book.chapterCount} ${book.chapterCount === 1 ? "chapter" : "chapters"}. Choose a chapter to read, or move through the book in order.`}
        actions={
          <Link
            href={`/bible/${translation.id}/${book.id}/1`}
            className="btn btn-primary"
          >
            <BookOpen className="size-4" aria-hidden />
            Read chapter 1
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/bible/${translation.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All books
          </Link>
          {otherEditions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Compare in</span>
              {otherEditions.map((edition) => (
                <Link
                  key={edition.id}
                  href={`/bible/${edition.id}/${book.id}`}
                  className="rounded-full border border-rule px-2.5 py-1 text-ink-soft hover:border-burgundy hover:text-burgundy"
                >
                  {edition.abbreviation}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {Array.from({ length: book.chapterCount }, (_, value) => value + 1).map(
            (chapter) => (
              <Link
                key={chapter}
                href={`/bible/${translation.id}/${book.id}/${chapter}`}
                className="flex h-11 items-center justify-center rounded-lg border border-rule bg-paper text-sm tabular-nums text-ink transition-colors hover:border-burgundy hover:bg-burgundy-tint hover:text-burgundy"
              >
                {chapter}
              </Link>
            ),
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-rule pt-5">
          {previous ? (
            <Link
              href={`/bible/${translation.id}/${previous.id}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{previous.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/bible/${translation.id}/${next.id}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
            >
              <span className="truncate">{next.name}</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Unavailable() { return <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><div className="card border-rule bg-parchment p-6"><h1 className="font-serif text-2xl text-ink">Bible data temporarily unavailable</h1><p className="mt-3 text-sm text-ink-soft">Please try again shortly.</p></div></div>; }
