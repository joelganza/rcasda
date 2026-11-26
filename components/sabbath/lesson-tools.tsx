"use client";

import { Bookmark, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";

import { useLibrary } from "@/lib/library";

export function LessonTools({
  lessonId,
  quarterId,
  lessonNumber,
  lessonTitle,
  quarterTitle,
}: {
  lessonId: string;
  quarterId: string;
  lessonNumber: number;
  lessonTitle: string;
  quarterTitle: string;
}) {
  const { isSaved, toggleSaved, saveItem, itemFor, recordHistory } = useLibrary();
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);

  const href = `/sabbath-school/${quarterId}/${String(lessonNumber).padStart(2, "0")}`;
  const bookmarkKey = `bookmark:lesson:${lessonId}`;
  const noteKey = `note:lesson:${lessonId}`;
  const noteSaved = isSaved(noteKey);

  useEffect(() => {
    recordHistory({
      clientId: `lesson:${lessonId}`,
      kind: "lesson",
      title: `Lesson ${lessonNumber}: ${lessonTitle}`,
      subtitle: quarterTitle,
      href,
    });
  }, [href, lessonId, lessonNumber, lessonTitle, quarterTitle, recordHistory]);

  useEffect(() => {
    const existing = itemFor(noteKey);
    if (existing?.body) setNote(existing.body);
  }, [itemFor, noteKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            toggleSaved(bookmarkKey, {
              type: "bookmark",
              kind: "lesson",
              title: `Lesson ${lessonNumber}: ${lessonTitle}`,
              subtitle: quarterTitle,
              href,
            })
          }
          aria-pressed={isSaved(bookmarkKey)}
          className={`btn btn-secondary btn-sm ${
            isSaved(bookmarkKey)
              ? "border-burgundy bg-burgundy-tint text-burgundy"
              : "border-rule text-ink-soft hover:border-burgundy hover:text-burgundy"
          }`}
        >
          <Bookmark
            className="size-4"
            aria-hidden
            fill={isSaved(bookmarkKey) ? "currentColor" : "none"}
          />
          {isSaved(bookmarkKey) ? "Lesson bookmarked" : "Bookmark lesson"}
        </button>
        <button
          type="button"
          onClick={() => setNoteOpen((value) => !value)}
          aria-expanded={noteOpen}
          className="btn btn-secondary btn-sm"
        >
          <NotebookPen className="size-4" aria-hidden />
          {noteSaved ? "Edit personal note" : "Add personal note"}
        </button>
      </div>

      {noteOpen ? (
        <div className="card border-rule bg-parchment p-4">
          <label htmlFor="lesson-note" className="text-sm font-medium text-ink">
            Personal note
          </label>
          <textarea
            id="lesson-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="What stood out to you this week?"
            className="mt-2 w-full resize-y rounded-lg border border-rule bg-paper p-3 text-sm text-ink outline-none focus:border-rule-strong"
          />
          <p className="mt-1 text-xs text-muted">Private to your account.</p>
          <div className="mt-3 flex justify-end gap-2">
            {noteSaved ? (
              <button
                type="button"
                onClick={() => {
                  saveItem(noteKey, {
                    type: "note",
                    kind: "lesson",
                    title: `Lesson ${lessonNumber}: ${lessonTitle}`,
                    subtitle: quarterTitle,
                    href,
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
              onClick={() => {
                saveItem(noteKey, {
                  type: "note",
                  kind: "lesson",
                  title: `Lesson ${lessonNumber}: ${lessonTitle}`,
                  subtitle: quarterTitle,
                  body: note.trim(),
                  href,
                });
                setNoteOpen(false);
              }}
              className="btn btn-primary btn-sm"
            >
              Save note
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
