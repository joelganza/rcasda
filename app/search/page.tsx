import { ArrowRight, Search as SearchIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { searchPlatform } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search",
  description:
    "Search verified Scripture, the public-domain hymn library and Sabbath School lesson metadata.",
};

const SUGGESTIONS = [
  "John 3:16",
  "Psalm 23",
  "Amazing Grace",
  "Murinzi",
  "Sabbath",
  "The Gift of Prophecy",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);
  const data = query.length >= 2 ? await searchPlatform(query, { limit: 12 }) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Search"
        title={query ? `Results for “${query}”` : "Search the library"}
        description="Search Scripture, hymns and Sabbath School lessons."
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <form action="/search" method="get" className="flex gap-2" role="search">
          <label htmlFor="platform-search" className="sr-only">
            Search Scripture, hymns and lessons
          </label>
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="platform-search"
              name="q"
              defaultValue={query}
              placeholder="John 3:16, hymn 300, “Sabbath rest”…"
              autoComplete="off"
              className="h-12 w-full rounded-lg border border-rule bg-paper pr-4 pl-10 text-sm text-ink outline-none focus:border-rule-strong"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary h-12 shrink-0 px-5"
          >
            Search
          </button>
        </form>

        {!query ? (
          <div className="mt-6 card border-rule bg-paper p-5">
            <p className="text-sm text-ink-soft">Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Link
                  key={suggestion}
                  href={`/search?q=${encodeURIComponent(suggestion)}`}
                  className="rounded-md border border-rule px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-burgundy hover:text-burgundy"
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          </div>
        ) : query.length < 2 ? (
          <p className="mt-6 text-sm text-muted">Enter at least two characters.</p>
        ) : !data || data.total === 0 ? (
          <div className="mt-8 card border-dashed border-rule-strong bg-surface/50 px-6 py-10 text-center">
            <SearchIcon className="mx-auto size-5 text-muted" aria-hidden />
            <p className="mt-2 font-serif text-lg text-ink">No results</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
              Nothing matched “{query}”. Check the spelling, try a Bible reference such as
              “Romans 8:28”, or search a hymn by first line.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-xs text-muted">{data.total} results</p>
            <div className="mt-3 space-y-8">
              {data.groups.map((group) => (
                <section key={group.category}>
                  <h2 className="flex items-baseline gap-2 font-serif text-lg text-ink">
                    {group.label}
                    <span className="text-xs font-sans text-muted">{group.total}</span>
                  </h2>
                  <ul className="mt-2 divide-y divide-rule overflow-hidden card border-rule bg-paper">
                    {group.results.map((result) => (
                      <li key={result.id}>
                        <Link
                          href={result.href}
                          className="group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-surface"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-medium text-ink group-hover:text-burgundy">
                                {result.title}
                              </span>
                              {result.meta ? (
                                <span className="text-xs text-muted">{result.meta}</span>
                              ) : null}
                            </span>
                            {result.excerpt ? (
                              <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-ink-soft">
                                {result.excerpt}
                              </span>
                            ) : null}
                          </span>
                          <ArrowRight className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
