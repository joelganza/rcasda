import type { VerseRef } from "./types";

export function bibleHref(
  translationId: string,
  bookId: string,
  chapter: number,
  verse?: number,
): string {
  const base = `/bible/${translationId}/${bookId}/${chapter}`;
  return verse ? `${base}#v${verse}` : base;
}

export function hymnHref(collectionId: string, number: number): string {
  return `/hymnal/${collectionId}/${number}`;
}

export function lessonHref(quarterId: string, lessonNumber: number): string {
  return `/sabbath-school/${quarterId}/${String(lessonNumber).padStart(2, "0")}`;
}

export function verseRefKey(ref: VerseRef): string {
  return `${ref.translationId}:${ref.bookId}:${ref.chapter}:${ref.verse}${
    ref.endVerse ? `-${ref.endVerse}` : ""
  }`;
}
