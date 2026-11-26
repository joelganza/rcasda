"use client";

import {
  Bookmark,
  Check,
  Copy,
  Heart,
  MoreHorizontal,
  NotebookPen,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { verseItemKey, useLibrary } from "@/lib/library";
import { bibleHref } from "@/lib/routes";
import type { VerseRef } from "@/lib/types";

export function VerseActions({
  verseRef,
  text,
  translationName,
}: {
  verseRef: VerseRef;
  text: string;
  translationName: string;
}) {
  const { itemFor, toggleSaved, saveItem } = useLibrary();
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reference = `${verseRef.bookName} ${verseRef.chapter}:${verseRef.verse}`;
  const key = verseItemKey(verseRef);
  const bookmarkKey = `bookmark:${key}`;
  const favoriteKey = `favorite:${key}`;
  const noteKey = `note:${key}`;
  const href = bibleHref(
    verseRef.translationId,
    verseRef.bookId,
    verseRef.chapter,
    verseRef.verse,
  );

  const saved = (k: string) => Boolean(itemFor(k));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const existing = itemFor(noteKey);
    if (existing?.body) setNote(existing.body);
  }, [itemFor, noteKey]);

  async function copyVerse() {
    const payload = `“${text}” — ${reference} (${translationName})`;
    try {
      await navigator.clipboard.writeText(payload);
      setStatus("Verse copied");
    } catch {
      setStatus("Copy failed — select the text instead");
    }
    setTimeout(() => setStatus(null), 2200);
  }

  async function shareVerse() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${href}`
        : href;
    const payload = {
      title: `${reference} — ${translationName}`,
      text: `“${text}” — ${reference} (${translationName})`,
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // The person dismissed the share sheet; fall through silently.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${payload.text}\n${url}`);
      setStatus("Link copied");
    } catch {
      setStatus("Could not copy the link");
    }
    setTimeout(() => setStatus(null), 2200);
  }

  const noteSaved = saved(noteKey);

  return (
    <div className="relative inline-block align-baseline" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Actions for ${reference}`}
        className={`ml-1 inline-flex size-6 translate-y-[2px] items-center justify-center rounded-full text-muted transition-opacity hover:bg-surface hover:text-ink focus-visible:opacity-100 ${
          open ? "opacity-100" : "opacity-0 group-hover/verse:opacity-100 [@media(hover:none)]:opacity-60"
        }`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-rule bg-paper p-1 text-left shadow-[var(--shadow-soft)]">
          <button
            type="button"
            onClick={() => {
              toggleSaved(bookmarkKey, {
                type: "bookmark",
                kind: "verse",
                title: reference,
                subtitle: translationName,
                href,
                ref: verseRef,
              });
              setStatus(saved(bookmarkKey) ? "Bookmark removed" : "Bookmarked");
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface"
          >
            <Bookmark
              className={`size-4 ${saved(bookmarkKey) ? "fill-burgundy text-burgundy" : ""}`}
              aria-hidden
            />
            {saved(bookmarkKey) ? "Remove bookmark" : "Bookmark verse"}
          </button>
          <button
            type="button"
            onClick={() => {
              toggleSaved(favoriteKey, {
                type: "favorite",
                kind: "verse",
                title: reference,
                subtitle: translationName,
                href,
                ref: verseRef,
              });
              setStatus(saved(favoriteKey) ? "Removed from favourites" : "Added to favourites");
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface"
          >
            <Heart
              className={`size-4 ${saved(favoriteKey) ? "fill-burgundy text-burgundy" : ""}`}
              aria-hidden
            />
            {saved(favoriteKey) ? "Remove favourite" : "Favourite verse"}
          </button>
          <button
            type="button"
            onClick={() => {
              setNote(itemFor(noteKey)?.body ?? "");
              setNoteOpen(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface"
          >
            <NotebookPen className="size-4" aria-hidden />
            {noteSaved ? "Edit personal note" : "Add personal note"}
          </button>
          <div className="my-1 h-px bg-rule" />
          <button
            type="button"
            onClick={copyVerse}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface"
          >
            <Copy className="size-4" aria-hidden />
            Copy verse
          </button>
          <button
            type="button"
            onClick={shareVerse}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-surface"
          >
            <Share2 className="size-4" aria-hidden />
            Share verse
          </button>
        </div>
      ) : null}

      {status ? (
        <span
          role="status"
          className="absolute left-0 top-full z-30 mt-1 flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2 py-1 text-xs text-ink-soft shadow-sm"
        >
          <Check className="size-3 text-burgundy" aria-hidden />
          {status}
        </span>
      ) : null}

      {noteOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Personal note on ${reference}`}
        >
          <div className="w-full max-w-md card border-rule bg-paper p-4 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Personal note</p>
                <p className="mt-0.5 text-sm text-muted">
                  {reference} · {translationName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="rounded-md p-1 text-muted hover:text-ink"
                aria-label="Close note editor"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="What stood out to you?"
              className="mt-3 w-full resize-y rounded-lg border border-rule bg-parchment p-3 text-sm text-ink outline-none focus:border-rule-strong"
            />
            <p className="mt-1 text-xs text-muted">Private to your account.</p>
            <div className="mt-3 flex items-center justify-end gap-2">
              {noteSaved ? (
                <button
                  type="button"
                  onClick={() => {
                    saveItem(noteKey, {
                      type: "note",
                      kind: "verse",
                      title: reference,
                      subtitle: translationName,
                      href,
                      ref: verseRef,
                    });
                    setNote("");
                    setNoteOpen(false);
                  }}
                  className="btn btn-quiet btn-sm text-burgundy"
                >
                  Delete note
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="btn btn-quiet btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveItem(noteKey, {
                    type: "note",
                    kind: "verse",
                    title: reference,
                    subtitle: translationName,
                    body: note.trim(),
                    href,
                    ref: verseRef,
                  });
                  setNoteOpen(false);
                }}
                className="btn btn-primary btn-sm"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
