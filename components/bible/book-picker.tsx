"use client";

import { ArrowLeft, LayoutGrid, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookSummary } from "@/lib/bible";
import { bibleHref } from "@/lib/routes";

export function BookPicker({
  books,
  translationId,
  currentBookId,
  currentChapter,
}: {
  books: BookSummary[];
  translationId: string;
  currentBookId?: string;
  currentChapter?: number;
}) {
  const [open, setOpen] = useState(false);
  const [testament, setTestament] = useState<"OT" | "NT">("OT");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<BookSummary | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => filterRef.current?.focus(), 30);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("keydown", onKeyDown);
      };
    }
    setSelected(null);
    setFilter("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const visible = useMemo(
    () =>
      books
        .filter((book) => book.testament === testament)
        .filter((book) =>
          filter.trim()
            ? book.name.toLowerCase().includes(filter.trim().toLowerCase())
            : true,
        ),
    [books, filter, testament],
  );

  const oldTestamentCount = books.filter((book) => book.testament === "OT").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
      >
        <LayoutGrid className="size-4" aria-hidden />
        Books
        <span className="sr-only">— choose a book and chapter</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/35 px-3 pt-[6vh] backdrop-blur-[2px] sm:pt-[10vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Choose a book and chapter"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden card border-rule bg-paper shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
              {selected ? (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1 text-muted hover:text-ink"
                  aria-label="Back to books"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              ) : (
                <Search className="size-4 shrink-0 text-muted" aria-hidden />
              )}
              {selected ? (
                <p className="flex-1 font-serif text-lg text-ink">{selected.name}</p>
              ) : (
                <input
                  ref={filterRef}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Find a book…"
                  aria-label="Find a book"
                  className="h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {selected ? (
              <div className="max-h-[62vh] overflow-y-auto p-4">
                <p className="mb-3 text-sm text-muted">
                  {selected.chapterCount}{" "}
                  {selected.chapterCount === 1 ? "chapter" : "chapters"}
                </p>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                  {Array.from({ length: selected.chapterCount }, (_, index) => index + 1).map(
                    (chapter) => {
                      const isCurrent =
                        selected.id === currentBookId && chapter === currentChapter;
                      return (
                        <Link
                          key={chapter}
                          href={bibleHref(translationId, selected.id, chapter)}
                          onClick={() => setOpen(false)}
                          className={`flex h-9 items-center justify-center rounded-md border text-sm tabular-nums transition-colors ${
                            isCurrent
                              ? "border-burgundy bg-burgundy text-white"
                              : "border-rule text-ink-soft hover:border-rule-strong hover:bg-surface"
                          }`}
                        >
                          {chapter}
                        </Link>
                      );
                    },
                  )}
                </div>
                <Link
                  href={`/bible/${translationId}/${selected.id}`}
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex text-sm text-burgundy hover:underline"
                >
                  Open {selected.name} overview
                </Link>
              </div>
            ) : (
              <div className="max-h-[62vh] overflow-y-auto">
                <div className="flex gap-1 border-b border-rule px-4 py-2">
                  {(["OT", "NT"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTestament(value)}
                      aria-pressed={testament === value}
                      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                        testament === value
                          ? "bg-burgundy-tint text-burgundy"
                          : "text-ink-soft hover:bg-surface"
                      }`}
                    >
                      {value === "OT"
                        ? `Old Testament (${oldTestamentCount})`
                        : `New Testament (${books.length - oldTestamentCount})`}
                    </button>
                  ))}
                </div>
                <div className="grid gap-1 p-3 sm:grid-cols-2">
                  {visible.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelected(book)}
                      className={`flex items-baseline justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface ${
                        book.id === currentBookId ? "text-burgundy" : "text-ink"
                      }`}
                    >
                      <span>{book.name}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {book.chapterCount}
                      </span>
                    </button>
                  ))}
                  {visible.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted">
                      No book matches “{filter}”.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
