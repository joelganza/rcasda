import { ArrowLeft, ArrowRight, CircleSlash, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HymnFavorite } from "@/components/hymnal/hymn-tools";
import { PageHeader, VerificationBadge } from "@/components/page-header";
import { getHymnCollection, listHymns } from "@/lib/hymns";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { collection: collectionId } = await params;
  const collection = await getHymnCollection(collectionId);
  return { title: collection?.name ?? "Hymnal" };
}

export default async function HymnCollectionPage({ params, searchParams }: Props) {
  const { collection: collectionId } = await params;
  const { q, page } = await searchParams;
  const collection = await getHymnCollection(collectionId);
  if (!collection) notFound();

  if (
    collection.verificationStatus === "UNAVAILABLE" ||
    collection.hymnCount === 0
  ) {
    return (
      <div>
        <PageHeader
          eyebrow="Hymnal"
          title={collection.name}
          description={
            collection.languageCode === "rw" ? "Ikinyarwanda" : "English"
          }
          photo={PHOTOS.hymnal}
          actions={<VerificationBadge status={collection.verificationStatus} />}
        />
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="card border-dashed border-rule-strong bg-parchment p-6 md:p-8">
            <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-muted">
              <CircleSlash className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-serif text-2xl text-ink">
              No authorised text is available
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {collection.availabilityNote}
            </p>
            <dl className="mt-5 grid gap-3 border-t border-rule pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
                  Publisher
                </dt>
                <dd className="mt-1 text-ink-soft">{collection.publisher}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
                  Licence
                </dt>
                <dd className="mt-1 text-ink-soft">{collection.license}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/hymnal/hymnary-pd-en"
                className="btn btn-primary"
              >
                Open the public-domain library
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

  const results = await listHymns(collectionId, {
    query: q,
    page: Number(page) || 1,
  });

  return (
    <div>
      <PageHeader
        eyebrow={`Hymnal · ${collection.languageCode === "rw" ? "Ikinyarwanda" : "English"}`}
        title={collection.name}
        description={`${collection.hymnCount.toLocaleString()} ${collection.hymnCount === 1 ? "hymn" : "hymns"}.`}
        photo={PHOTOS.hymnal}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {collection.verificationStatus !== "VERIFIED" ? (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <VerificationBadge status={collection.verificationStatus} />
            <p className="mt-2">{collection.availabilityNote}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/hymnal"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All collections
          </Link>
          <form action={`/hymnal/${collection.id}`} className="flex flex-1 gap-2 sm:max-w-md">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-rule bg-paper px-3">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <label htmlFor="collection-search" className="sr-only">
                Search this collection
              </label>
              <input
                id="collection-search"
                name="q"
                defaultValue={results.query}
                placeholder="Title, first line, author or number…"
                className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
          <p className="text-sm text-muted">
            {results.total.toLocaleString()}{" "}
            {results.total === 1 ? "hymn" : "hymns"}
            {results.query ? ` matching “${results.query}”` : ""}
          </p>
          <p className="text-xs text-muted">
            Page {results.page} of {results.pages}
          </p>
        </div>

        {results.hymns.length === 0 ? (
          <div className="mt-8 card border-dashed border-rule-strong bg-parchment px-5 py-10 text-center">
            <h2 className="font-serif text-xl text-ink">No hymn found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              Try a shorter title, first line, author or number.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {results.hymns.map((hymn) => (
              <li key={hymn.id} className="flex items-center gap-3 py-3">
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">
                  {hymn.number}
                </span>
                <Link
                  href={`/hymnal/${collection.id}/${hymn.number}`}
                  className="group min-w-0 flex-1"
                >
                  <span className="block truncate text-[0.95rem] text-ink group-hover:text-burgundy">
                    {hymn.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {hymn.firstLine}
                    {hymn.author ? ` · ${hymn.author}` : ""}
                  </span>
                </Link>
                <HymnFavorite
                  collectionId={collection.id}
                  number={hymn.number}
                  title={hymn.title}
                  subtitle={`No. ${hymn.number} · ${collection.name}`}
                  href={`/hymnal/${collection.id}/${hymn.number}`}
                  collectionName={collection.name}
                />
              </li>
            ))}
          </ul>
        )}

        {results.pages > 1 ? (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-4">
            {results.page > 1 ? (
              <Link
                href={pageHref(collection.id, results.query, results.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs tabular-nums text-muted">
              {results.page} / {results.pages}
            </span>
            {results.page < results.pages ? (
              <Link
                href={pageHref(collection.id, results.query, results.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Next
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
}

function pageHref(collectionId: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/hymnal/${collectionId}${suffix ? `?${suffix}` : ""}`;
}
