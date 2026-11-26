"use client";

import { ArrowRight, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { SearchResponse } from "@/lib/search-types";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const activeTranslation = pathname.match(/^\/bible\/([^/]+)/)?.[1];

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setData(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ q: trimmed, limit: "6" });
      if (activeTranslation && activeTranslation !== "bible") {
        params.set("translation", activeTranslation);
      }
      fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search is unavailable right now.");
          return (await response.json()) as SearchResponse;
        })
        .then((payload) => setData(payload))
        .catch((reason: Error) => {
          if (reason.name !== "AbortError") setError(reason.message);
        })
        .finally(() => setLoading(false));
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeTranslation, query, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-lg border border-rule bg-parchment px-3 py-2 text-sm text-muted transition-colors hover:border-rule-strong hover:text-ink md:w-56"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden md:inline">Search</span>
        <span className="sr-only md:hidden">Search</span>
        <kbd className="ml-auto hidden rounded border border-rule bg-paper px-1.5 py-0.5 text-[0.65rem] text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 px-3 py-4 backdrop-blur-[2px] sm:px-6 sm:py-10"
              role="dialog"
              aria-modal="true"
              aria-label="Search the platform"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div className="mx-auto w-full max-w-2xl overflow-hidden card border-rule bg-paper shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3 border-b border-rule px-4">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="John 3:16, hymn 300, “Sabbath rest”…"
                className="h-14 w-full bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted"
                aria-label="Search Scripture, hymns and Sabbath School lessons"
                autoComplete="off"
                spellCheck={false}
              />
              {loading ? (
                <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
              ) : null}
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1.5 text-muted hover:text-ink"
                aria-label="Close search"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="px-4 py-5 text-sm text-muted">
                  <p className="text-ink-soft">Try a reference, a hymn number, or a word.</p>
                  <ul className="mt-2 space-y-1 text-[0.85rem]">
                    <li>
                      <span className="text-ink">John 3:16</span> — opens the passage
                    </li>
                    <li>
                      <span className="text-ink">Amazing Grace</span> — finds the hymn
                    </li>
                    <li>
                      <span className="text-ink">Sabbath</span> — searches lessons and Scripture
                    </li>
                  </ul>
                </div>
              ) : error ? (
                <p className="px-4 py-5 text-sm text-burgundy">{error}</p>
              ) : data && data.total === 0 ? (
                <p className="px-4 py-5 text-sm text-muted">
                  Nothing found for “{data.query}”. Check the spelling or try a different
                  reference.
                </p>
              ) : data ? (
                <div className="divide-y divide-rule">
                  {data.groups.map((group) => (
                    <section key={group.category} className="px-2 py-2">
                      <p className="px-2 py-1 text-[0.68rem] font-medium tracking-[0.08em] text-muted uppercase">
                        {group.label}
                        <span className="ml-2 text-muted/70">{group.total}</span>
                      </p>
                      <ul>
                        {group.results.map((result) => (
                          <li key={result.id}>
                            <Link
                              href={result.href}
                              onClick={close}
                              className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline gap-x-2">
                                  <span className="text-sm font-medium text-ink">
                                    {result.title}
                                  </span>
                                  {result.meta ? (
                                    <span className="text-xs text-muted">{result.meta}</span>
                                  ) : null}
                                </span>
                                {result.excerpt ? (
                                  <span className="mt-0.5 block truncate text-[0.83rem] text-ink-soft">
                                    {result.excerpt}
                                  </span>
                                ) : null}
                              </span>
                              <ArrowRight
                                className="mt-1 size-3.5 shrink-0 text-muted"
                                aria-hidden
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  <div className="px-4 py-3">
                    <Link
                      href={`/search?q=${encodeURIComponent(query.trim())}`}
                      onClick={close}
                      className="inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
                    >
                      All results for “{query.trim()}”
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="px-4 py-5 text-sm text-muted">Searching…</p>
              )}
            </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
