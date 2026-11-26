"use client";

import {
  ArrowLeft,
  ArrowRight,
  Columns2,
  Minus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLibrary } from "@/lib/library";
import { usePreferences } from "@/lib/preferences";
import { bibleHref } from "@/lib/routes";
import type { VerseRef } from "@/lib/types";

import { BookPicker } from "./book-picker";
import { VerseActions } from "./verse-actions";

type Translation = {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright: string;
  license: string;
};

type Nav = { bookId: string; bookName: string; chapter: number } | null;

type Verse = { number: number; text: string };

export function BibleReader({
  translation,
  book,
  chapter,
  verses,
  parallelTranslation,
  parallelVerses,
  books,
  neighbours,
}: {
  translation: Translation;
  book: { id: string; name: string; chapterCount: number };
  chapter: number;
  verses: Verse[];
  parallelTranslation: Translation | null;
  parallelVerses: Verse[] | null;
  books: {
    id: string;
    order: number;
    testament: string;
    chapterCount: number;
    name: string;
    abbreviation: string;
  }[];
  neighbours: { previous: Nav; next: Nav };
}) {
  const router = useRouter();
  const { prefs, setSideBySide, changeReaderSize } = usePreferences();
  const { recordHistory } = useLibrary();
  const parallelMap = new Map((parallelVerses ?? []).map((v) => [v.number, v.text]));
  const compareEnabled = Boolean(parallelTranslation && parallelVerses?.length);
  const showParallel = compareEnabled && prefs.sideBySide;

  useEffect(() => {
    recordHistory({
      clientId: `chapter:${translation.id}:${book.id}:${chapter}`,
      kind: "passage",
      title: `${book.name} ${chapter}`,
      subtitle: `${translation.abbreviation} · ${translation.name}`,
      href: bibleHref(translation.id, book.id, chapter),
    });
  }, [book.id, book.name, chapter, recordHistory, translation.abbreviation, translation.id, translation.name]);

  function goToChapter(value: string) {
    router.push(bibleHref(translation.id, book.id, Number(value)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-3 border-b border-rule py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href={`/bible/${translation.id}/${book.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {book.name}
          </Link>
          <h1 className="mt-1.5 font-serif text-[2rem] leading-tight tracking-[-0.01em] text-ink md:text-[2.4rem]">
            {book.name}{" "}
            <span className="text-burgundy">{chapter}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {translation.name} · {translation.abbreviation}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BookPicker
            books={books}
            translationId={translation.id}
            currentBookId={book.id}
            currentChapter={chapter}
          />
          <label className="sr-only" htmlFor="chapter-select">
            Chapter
          </label>
          <select
            id="chapter-select"
            value={chapter}
            onChange={(event) => goToChapter(event.target.value)}
            className="h-[38px] rounded-lg border border-rule bg-paper px-3 text-sm text-ink-soft outline-none hover:border-rule-strong"
          >
            {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  Chapter {value}
                </option>
              ),
            )}
          </select>
          <div className="inline-flex items-center rounded-lg border border-rule">
            <button
              type="button"
              onClick={() => changeReaderSize(-1)}
              className="flex size-[38px] items-center justify-center rounded-l-lg text-ink-soft hover:text-ink"
              aria-label="Decrease reading text size"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="h-4 w-px bg-rule" aria-hidden />
            <button
              type="button"
              onClick={() => changeReaderSize(1)}
              className="flex size-[38px] items-center justify-center rounded-r-lg text-ink-soft hover:text-ink"
              aria-label="Increase reading text size"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
          {compareEnabled ? (
            <button
              type="button"
              onClick={() => setSideBySide(!prefs.sideBySide)}
              aria-pressed={showParallel}
              className={`inline-flex h-[38px] items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                showParallel
                  ? "border-burgundy bg-burgundy-tint text-burgundy"
                  : "border-rule text-ink-soft hover:border-rule-strong hover:text-ink"
              }`}
            >
              <Columns2 className="size-4" aria-hidden />
              <span className="hidden sm:inline">Side by side</span>
              <span className="sr-only sm:hidden">Side by side reading</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 rounded-full bg-surface">
          <div
            className="h-1 rounded-full bg-gold"
            style={{ width: `${(chapter / book.chapterCount) * 100}%` }}
          />
        </div>
        <p className="text-xs tabular-nums text-muted">
          {chapter} / {book.chapterCount}
        </p>
      </div>

      <article
        className={`page-in reading-column mx-auto py-8 ${
          showParallel ? "max-w-none md:max-w-4xl" : ""
        }`}
      >
        {showParallel && parallelTranslation ? (
          <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-4">
            {verses.map((verse) => {
              const ref: VerseRef = {
                translationId: translation.id,
                bookId: book.id,
                bookName: book.name,
                chapter,
                verse: verse.number,
              };
              const other = parallelMap.get(verse.number);
              return (
                <div key={verse.number} className="contents">
                  <div
                    id={`v${verse.number}`}
                    className="scripture verse-line group/verse scroll-mt-28"
                  >
                    <span className="verse-num">{verse.number}</span>
                    {verse.text}
                    <VerseActions
                      verseRef={ref}
                      text={verse.text}
                      translationName={translation.name}
                    />
                    <span className="mt-1 block text-[0.7rem] text-muted md:hidden">
                      {parallelTranslation.abbreviation}
                    </span>
                  </div>
                  <p className="scripture border-l-2 border-rule pl-4 text-ink-soft md:border-l md:pl-5">
                    <span className="verse-num">{verse.number}</span>
                    {other ?? <span className="text-muted">—</span>}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="scripture">
            {verses.map((verse) => {
              const ref: VerseRef = {
                translationId: translation.id,
                bookId: book.id,
                bookName: book.name,
                chapter,
                verse: verse.number,
              };
              return (
                <div
                  key={verse.number}
                  id={`v${verse.number}`}
                  className="group/verse verse-line scroll-mt-28"
                >
                  <span className="verse-num">{verse.number}</span>
                  {verse.text}
                  <VerseActions
                    verseRef={ref}
                    text={verse.text}
                    translationName={translation.name}
                  />
                </div>
              );
            })}
          </div>
        )}
      </article>

      <div className="mx-auto max-w-3xl border-t border-rule pt-5 pb-10">
        <div className="flex items-center justify-between gap-3">
          {neighbours.previous ? (
            <Link
              href={bibleHref(
                translation.id,
                neighbours.previous.bookId,
                neighbours.previous.chapter,
              )}
              className="group inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                {neighbours.previous.bookName} {neighbours.previous.chapter}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {neighbours.next ? (
            <Link
              href={bibleHref(
                translation.id,
                neighbours.next.bookId,
                neighbours.next.chapter,
              )}
              className="group inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
            >
              <span className="min-w-0 truncate">
                {neighbours.next.bookName} {neighbours.next.chapter}
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
        <p className="mt-5 text-xs text-muted">
          <Link href="/about" className="link-underline">
            About this edition
          </Link>
        </p>
      </div>
    </div>
  );
}
