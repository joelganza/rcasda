import { ArrowRight, BookOpen, CircleSlash } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookGrid } from "@/components/bible/book-grid";
import { PageHeader, VerificationBadge } from "@/components/page-header";
import { getBooks } from "@/lib/bible";
import { getTranslation } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ translation: string }> };

export async function generateMetadata({ params }: Props) {
  const { translation } = await params;
  return { title: translation.toUpperCase() };
}

export default async function TranslationPage({ params }: Props) {
  const { translation: translationId } = await params;
  const unavailable = { unavailable: true } as const;
  const translationResult = await safeDb(() => getTranslation(translationId), unavailable);
  if (translationResult === unavailable) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card border-rule bg-parchment p-6">
          <h1 className="font-serif text-2xl text-ink">Bible content is temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            We can’t connect to the database right now. Please try again shortly.
          </p>
          <Link href="/bible" className="mt-5 inline-flex text-sm text-burgundy hover:underline">
            Browse Bible editions
          </Link>
        </div>
      </div>
    );
  }
  const translation = translationResult as NonNullable<Awaited<ReturnType<typeof getTranslation>>>;
  if (!translation) notFound();

  const booksResult = await safeDb(() => getBooks(translation.languageCode, translation.id), unavailable);
  const booksUnavailable = booksResult === unavailable;
  const books = booksUnavailable ? [] : booksResult as Awaited<ReturnType<typeof getBooks>>;
  const available =
    translation.verificationStatus !== "UNAVAILABLE" &&
    translation.verseCount > 0;

  if (!available) {
    return (
      <div>
        <PageHeader
          eyebrow="Scripture"
          title={translation.name}
          description={`${translation.language} · ${translation.abbreviation}`}
          photo={PHOTOS.bible}
          actions={<VerificationBadge status={translation.verificationStatus} />}
        />
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="card border-dashed border-rule-strong bg-parchment p-6 md:p-8">
            <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-muted">
              <CircleSlash className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-serif text-2xl text-ink">
              This edition is not available yet
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {translation.availabilityNote}
            </p>
            <dl className="mt-5 grid gap-3 border-t border-rule pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
                  Rights holder
                </dt>
                <dd className="mt-1 text-ink-soft">{translation.copyright}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
                  Licence
                </dt>
                <dd className="mt-1 text-ink-soft">{translation.license}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/bible"
                className="btn btn-primary"
              >
                Read an available edition
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/about"
                className="btn btn-secondary"
              >
                Sourcing policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${translation.language} · ${translation.abbreviation}`}
        title={translation.name}
        description={`${translation.bookCount} books and ${translation.verseCount.toLocaleString()} imported verses.${translation.verificationStatus === "VERIFIED" && translation.isComplete ? " Verified for this edition." : " Verification is pending; review the source and limitations before relying on this text."}`}
        photo={PHOTOS.bible}
        actions={
          books[0] ? (
            <Link
              href={`/bible/${translation.id}/${books[0].id}/1`}
              className="btn btn-primary"
            >
              <BookOpen className="size-4" aria-hidden />
              Start at Genesis
            </Link>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {booksUnavailable ? (
          <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            Bible books are temporarily unavailable. Please try again shortly.
          </p>
        ) : null}
        {translation.verificationStatus !== "VERIFIED" || !translation.isComplete ? (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <VerificationBadge status={translation.verificationStatus} />
            <p className="mt-2">{translation.availabilityNote}</p>
          </div>
        ) : null}
        <BookGrid
          books={books}
          hrefFor={(book) => `/bible/${translation.id}/${book.id}`}
        />

        <p className="mt-10 border-t border-rule pt-5 text-xs text-muted">
          <Link href="/about" className="link-underline">
            About this edition
          </Link>
        </p>
      </div>
    </div>
  );
}
