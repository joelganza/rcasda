"use client";

import {
  Bookmark,
  BookOpen,
  CalendarCheck,
  Heart,
  History,
  LogOut,
  NotebookPen,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLibrary } from "@/lib/library";
import { lessonHref } from "@/lib/routes";
import type { SavedItem, SessionUser } from "@/lib/types";

type Tab = "saved" | "notes" | "history" | "progress";

const TABS: { id: Tab; label: string; icon: typeof Bookmark }[] = [
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "history", label: "History", icon: History },
  { id: "progress", label: "Progress", icon: CalendarCheck },
];

export function LibraryView({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const {
    ready,
    snapshot,
    syncState,
    removeItem,
    clearHistory,
    itemsOfType,
  } = useLibrary();
  const [tab, setTab] = useState<Tab>("saved");
  const [signingOut, setSigningOut] = useState(false);

  const bookmarks = itemsOfType("bookmark");
  const favorites = itemsOfType("favorite");
  const notes = itemsOfType("note");

  const lessonGroups = new Map<string, number>();
  for (const entry of snapshot.lessonProgress) {
    lessonGroups.set(entry.lessonId, (lessonGroups.get(entry.lessonId) ?? 0) + 1);
  }
  const planGroups = new Map<string, number>();
  for (const entry of snapshot.planProgress) {
    planGroups.set(entry.planId, (planGroups.get(entry.planId) ?? 0) + 1);
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 card border-rule bg-paper px-4 py-3">
        {user ? (
          <div className="text-sm">
            <p className="font-medium text-ink">{user.name ?? user.email}</p>
            <p className="text-xs text-muted">
              Signed in{user.role === "ADMIN" ? " · administrator" : ""} ·{" "}
              {syncState === "offline"
                ? "saved on this device while offline"
                : syncState === "saving"
                  ? "syncing…"
                  : "synced to your account"}
            </p>
          </div>
        ) : (
          <div className="text-sm">
            <p className="font-medium text-ink">Saving on this device</p>
            <p className="text-xs text-muted">
              <Link href="/login" className="text-burgundy hover:underline">
                Sign in
              </Link>{" "}
              to keep your library across devices.
            </p>
          </div>
        )}

        {user ? (
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs text-ink-soft hover:border-rule-strong hover:text-ink disabled:opacity-60"
          >
            <LogOut className="size-3.5" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        ) : (
          <Link
            href="/register"
            className="btn btn-primary btn-sm"
          >
            Create account
          </Link>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Library sections"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-rule"
      >
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${entry.id}`}
              id={`tab-${entry.id}`}
              onClick={() => setTab(entry.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-gold text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
        {!ready ? <p className="text-sm text-muted">Loading your library…</p> : null}

        {ready && tab === "saved" ? (
          <div className="space-y-8">
            <ItemGroup
              title="Bookmarks"
              description="Verses and lessons you marked to return to."
              items={bookmarks}
              onRemove={removeItem}
              empty="No bookmarks yet. Use the bookmark icon while reading."
            />
            <ItemGroup
              title="Favourites"
              description="Hymns, passages and lessons you love."
              items={favorites}
              onRemove={removeItem}
              empty="No favourites yet. Tap the heart on a hymn or passage."
            />
          </div>
        ) : null}

        {ready && tab === "notes" ? (
          <div>
            {notes.length === 0 ? (
              <Empty
                icon={NotebookPen}
                title="No notes yet"
                body="Personal notes written while reading a chapter appear here. They stay private to your account."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {notes.map((note) => (
                  <li key={note.clientId} className="card border-rule bg-paper p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-ink">{note.title}</p>
                      <RemoveButton onClick={() => removeItem(note.clientId)} label={`Delete note ${note.title}`} />
                    </div>
                    {note.subtitle ? (
                      <p className="mt-0.5 text-xs text-muted">{note.subtitle}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                      {note.body}
                    </p>
                    <Link
                      href={note.href}
                      className="mt-3 inline-block text-xs text-burgundy hover:underline"
                    >
                      Open passage
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {ready && tab === "history" ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                Your last {snapshot.history.length} reading visits.
              </p>
              {snapshot.history.length ? (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-muted hover:text-burgundy"
                >
                  Clear history
                </button>
              ) : null}
            </div>
            {snapshot.history.length === 0 ? (
              <div className="mt-4">
                <Empty
                  icon={History}
                  title="Nothing read yet"
                  body="Chapters, hymns and lessons you open will appear here so you can pick up where you left off."
                />
              </div>
            ) : (
              <ol className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
                {snapshot.history.map((entry) => (
                  <li key={`${entry.clientId}-${entry.updatedAt}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={entry.href} className="truncate text-sm text-ink hover:text-burgundy">
                        {entry.title}
                      </Link>
                      {entry.subtitle ? (
                        <p className="truncate text-xs text-muted">{entry.subtitle}</p>
                      ) : null}
                    </div>
                    <time
                      dateTime={entry.updatedAt}
                      className="shrink-0 text-xs text-muted"
                    >
                      {formatDate(entry.updatedAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}

        {ready && tab === "progress" ? (
          <div className="space-y-8">
            <section>
              <h2 className="font-serif text-lg text-ink">Sabbath School lessons</h2>
              <p className="mt-1 text-sm text-muted">
                Days you completed in the current and recent lessons.
              </p>
              {lessonGroups.size === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No completed lesson days yet.{" "}
                  <Link href="/sabbath-school" className="text-burgundy hover:underline">
                    Open this week&apos;s lesson
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
                  {[...lessonGroups.entries()].map(([lessonId, count]) => (
                    <li key={lessonId} className="flex items-center gap-3 px-4 py-3">
                      <BookOpen className="size-4 shrink-0 text-burgundy" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <Link href={lessonHrefForId(lessonId)} className="text-sm text-ink hover:text-burgundy">
                          Lesson {lessonId.slice(8)}
                        </Link>
                        <p className="text-xs text-muted">{lessonId.slice(0, 7)} quarter</p>
                      </div>
                      <span className="text-xs tabular-nums text-muted">{count} days</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink">Reading plans</h2>
              <p className="mt-1 text-sm text-muted">
                Completed days across the plans you have started. Plan progress is shown in
                full on each plan page.
              </p>
              {planGroups.size === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No plan days completed yet.{" "}
                  <Link href="/plans" className="text-burgundy hover:underline">
                    Choose a reading plan
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
                  {[...planGroups.entries()].map(([planId, count]) => (
                    <li key={planId} className="flex items-center gap-3 px-4 py-3">
                      <CalendarCheck className="size-4 shrink-0 text-burgundy" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">{planTitle(planId)}</p>
                        <p className="text-xs text-muted">{count} days completed</p>
                      </div>
                      <Link href="/plans" className="text-xs text-burgundy hover:underline">
                        Open plans
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ItemGroup({
  title,
  description,
  items,
  onRemove,
  empty,
}: {
  title: string;
  description: string;
  items: SavedItem[];
  onRemove: (key: string) => void;
  empty: string;
}) {
  return (
    <section>
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
          {items.map((item) => (
            <li key={item.clientId} className="flex items-start gap-3 px-4 py-3">
              {item.type === "favorite" ? (
                <Heart className="mt-0.5 size-4 shrink-0 fill-burgundy/10 text-burgundy" aria-hidden />
              ) : (
                <Bookmark className="mt-0.5 size-4 shrink-0 text-burgundy" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <Link href={item.href} className="text-sm text-ink hover:text-burgundy">
                  {item.title}
                </Link>
                {item.subtitle ? (
                  <p className="text-xs text-muted">{item.subtitle}</p>
                ) : null}
                {item.body ? (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink-soft">
                    {item.body}
                  </p>
                ) : null}
              </div>
              <RemoveButton onClick={() => onRemove(item.clientId)} label={`Remove ${item.title}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-burgundy"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Bookmark;
  title: string;
  body: string;
}) {
  return (
    <div className="card border-dashed border-rule-strong bg-surface/50 px-6 py-10 text-center">
      <Icon className="mx-auto size-5 text-muted" aria-hidden />
      <p className="mt-2 font-serif text-lg text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function lessonHrefForId(lessonId: string) {
  const quarter = lessonId.slice(0, 7);
  const number = Number(lessonId.slice(8));
  return lessonHref(quarter, Number.isFinite(number) ? number : 1);
}

const PLAN_TITLES: Record<string, string> = {
  "whole-bible-365": "The whole Bible in a year",
  "new-testament-90": "The New Testament in 90 days",
  "psalms-30": "Psalms in 30 days",
};

function planTitle(planId: string) {
  return PLAN_TITLES[planId] ?? planId;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
