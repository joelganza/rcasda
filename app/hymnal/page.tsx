import { ArrowRight, CircleSlash, Music4, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader, SectionTitle } from "@/components/page-header";
import { getFeaturedHymns, getHymnCollections } from "@/lib/hymns";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hymnal",
  description:
    "Search the supplied 500-hymn Kinyarwanda SDA hymnal and a public-domain hymn library, with the official English hymnal's availability documented.",
};

export default async function HymnalPage() {
  const [collections, featured] = await Promise.all([
    getHymnCollections(),
    getFeaturedHymns(6),
  ]);
  const available = collections.filter(
    (collection) =>
      collection.verificationStatus !== "UNAVAILABLE" && collection.hymnCount > 0,
  );
  const kinyarwanda = collections.find(
    (collection) =>
      collection.id === "sda-hymnal-rw" && collection.hymnCount > 0,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Hymnody"
        title="The Hymnal"
        description="30,089 classic hymns and the 500-hymn Kinyarwanda SDA hymnal."
        photo={PHOTOS.hymnal}
        actions={
          featured.collection ? (
            <Link href={`/hymnal/${featured.collection.id}`} className="btn btn-primary">
              <Music4 className="size-4" aria-hidden />
              Browse all hymns
            </Link>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {available.length > 0 ? (
          <form
            action={`/hymnal/${available[0].id}`}
            className="flex flex-col gap-2 card border-rule bg-parchment p-4 sm:flex-row"
          >
            <label htmlFor="hymn-search" className="sr-only">
              Search hymns
            </label>
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-rule bg-paper px-3">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                id="hymn-search"
                name="q"
                placeholder="Search by title, number or first line…"
                className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Search hymns
            </button>
          </form>
        ) : null}

        {kinyarwanda ? (
          <Link
            href={`/hymnal/${kinyarwanda.id}`}
            className="group mt-4 flex flex-col gap-3 card border-burgundy/25 bg-burgundy-tint/40 p-4 hover:border-burgundy sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-start gap-3">
              <Music4 className="mt-0.5 size-4 shrink-0 text-burgundy" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-ink group-hover:text-burgundy">
                  {kinyarwanda.name}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {kinyarwanda.hymnCount} Kinyarwanda hymns.
                </span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 pl-7 text-sm font-medium text-burgundy transition-transform duration-300 group-hover:translate-x-1 sm:pl-0">
              Open the hymnal <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        ) : null}

        <section className="mt-10">
          <SectionTitle title="Collections" />
          <div className="stagger grid gap-3 md:grid-cols-2">
            {collections.map((collection) => {
              const isAvailable =
                collection.verificationStatus !== "UNAVAILABLE" &&
                collection.hymnCount > 0;
              const verified = collection.verificationStatus === "VERIFIED";
              return (
                <Link
                  key={collection.id}
                  href={`/hymnal/${collection.id}`}
                  className={`group flex flex-col justify-between card bg-paper p-5 ${
                    isAvailable
                      ? "border-rule hover:border-burgundy"
                      : "border-dashed border-rule-strong"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.1em] text-burgundy uppercase">
                        {isAvailable ? (
                          <Music4 className="size-3.5" aria-hidden />
                        ) : (
                          <CircleSlash className="size-3.5" aria-hidden />
                        )}
                        Hymn collection
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-xl leading-snug text-ink transition-colors duration-300 group-hover:text-burgundy">
                      {collection.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {collection.languageCode === "rw" ? "Ikinyarwanda" : "English"}
                      {collection.hymnCount > 0
                        ? ` · ${collection.hymnCount.toLocaleString()} hymns`
                        : " · no authorised text"}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {verified
                        ? "Ready to read and search."
                        : isAvailable
                          ? "Imported; content and rights review pending."
                          : collection.availabilityNote ?? "Not available in this library."}
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy">
                    {isAvailable ? "Open collection" : "Read the availability note"}
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

        {featured.collection && featured.hymns.length > 0 ? (
          <section className="reveal mt-12">
            <SectionTitle
              title="From the public-domain library"
              action={
                <Link
                  href={`/hymnal/${featured.collection.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
                >
                  All hymns <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            />
            <ul className="grid gap-2 sm:grid-cols-2">
              {featured.hymns.map((hymn) => (
                <li key={hymn.id}>
                  <Link
                    href={`/hymnal/${featured.collection!.id}/${hymn.number}`}
                    className="group flex items-baseline gap-3 rounded-lg border border-rule bg-paper px-4 py-3 transition-colors hover:border-burgundy"
                  >
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">
                      {hymn.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink group-hover:text-burgundy">
                        {hymn.title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {hymn.firstLine}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </div>
    </div>
  );
}
