import { ArrowRight, BookOpen, CircleSlash } from "lucide-react";
import Link from "next/link";

import { BookGrid } from "@/components/bible/book-grid";
import { PageHeader } from "@/components/page-header";
import { getBooks } from "@/lib/bible";
import { listTranslations } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bible",
  description:
    "Read the public-domain King James Version and World English Bible, and the supplied Kinyarwanda Bibiliya Yera with its source and rights status stated plainly.",
};

export default async function BibleIndexPage() {
  const unavailable = { unavailable: true } as const;
  const [translationResult, booksResult] = await Promise.all([
    safeDb(listTranslations, unavailable),
    safeDb(() => getBooks("en"), unavailable),
  ]);
  const failed = translationResult === unavailable || booksResult === unavailable;
  const translations = translationResult === unavailable ? [] : translationResult as Awaited<ReturnType<typeof listTranslations>>;
  const books = booksResult === unavailable ? [] : booksResult as Awaited<ReturnType<typeof getBooks>>;
  const verified = translations.filter(
    (translation) =>
      translation.verificationStatus === "VERIFIED" && translation.isComplete,
  );
  const primary = verified[0];

  return (
    <div>
      <PageHeader
        eyebrow="Scripture"
        title="The Bible"
        description="The King James Version, World English Bible and the supplied Kinyarwanda Bible."
        photo={PHOTOS.bibleCloseup}
        actions={
          primary ? (
            <Link href={`/bible/${primary.id}`} className="btn btn-primary">
              Start reading <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {failed ? <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Bible data is temporarily unavailable. Please try again shortly.</p> : null}
        <section>
          <h2 className="font-serif text-xl text-ink">Editions</h2>
          <div className="stagger mt-4 grid gap-3 md:grid-cols-2">
            {translations.map((translation) => {
              const available =
                translation.verificationStatus !== "UNAVAILABLE" &&
                translation.verseCount > 0;
              const verified =
                translation.verificationStatus === "VERIFIED" &&
                translation.isComplete;
              return (
                <Link
                  key={translation.id}
                  href={`/bible/${translation.id}`}
                  className={`group flex flex-col justify-between card bg-paper p-5 ${
                    available
                      ? "border-rule hover:border-burgundy"
                      : "border-dashed border-rule-strong hover:border-rule-strong"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.1em] text-burgundy uppercase">
                        {available ? (
                          <BookOpen className="size-3.5" aria-hidden />
                        ) : (
                          <CircleSlash className="size-3.5" aria-hidden />
                        )}
                        {verified
                          ? "Verified edition"
                          : available
                            ? "Pending review"
                            : "Unavailable"}
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-xl transition-colors duration-300 group-hover:text-burgundy">
                      {translation.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {translation.language} · {translation.abbreviation}
                      {translation.year ? ` · ${translation.year}` : ""}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {available
                        ? `${translation.bookCount} books · ${translation.verseCount.toLocaleString()} imported verses${verified ? "" : " · review pending"}`
                        : translation.availabilityNote ?? "Not available in this library."}
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy">
                    {available ? "Browse this edition" : "See availability details"}
                    <ArrowRight
                      className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl text-ink">Browse the canon</h2>
          <p className="mt-1 text-sm text-muted">
            {primary
              ? `Opens in the ${primary.name}.`
              : "A verified edition is needed before reading."}
          </p>
          <div className="mt-4">
            <BookGrid
              books={books}
              hrefFor={(book) =>
                primary ? `/bible/${primary.id}/${book.id}/1` : "/bible"
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

