"use client";

import { ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { SabbathDayContent, SabbathWeek } from "@/lib/adventech";

type Loadable<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "The lesson could not be loaded.",
    );
  }

  return payload as T;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function buildSelectionQuery(quarterId?: string, lessonId?: string): string {
  if (!quarterId || !lessonId) return "";
  const params = new URLSearchParams();
  params.set("quarter", quarterId);
  params.set("lesson", lessonId);
  return params.toString();
}

export function SabbathSchoolWidget({
  quarterId,
  lessonId,
  showHeader = true,
}: {
  quarterId?: string;
  lessonId?: string;
  showHeader?: boolean;
}) {
  const selectionQuery = buildSelectionQuery(quarterId, lessonId);
  const weekUrl = `/api/sabbath-school/current${selectionQuery ? `?${selectionQuery}` : ""}`;
  const [week, setWeek] = useState<Loadable<SabbathWeek>>({ status: "loading" });
  const [selectedDay, setSelectedDay] = useState("");
  const [day, setDay] = useState<Loadable<SabbathDayContent>>({ status: "loading" });
  const [weekAttempt, setWeekAttempt] = useState(0);
  const [dayAttempt, setDayAttempt] = useState(0);
  const selectId = useId();

  useEffect(() => {
    const controller = new AbortController();
    setWeek({ status: "loading" });
    setSelectedDay("");

    fetch(weekUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(readJson<SabbathWeek>)
      .then((data) => {
        if (controller.signal.aborted) return;
        setWeek({ status: "ready", data });
        setSelectedDay(data.todayDayId);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setWeek({
          status: "error",
          message: errorMessage(error, "This lesson could not be loaded."),
        });
      });

    return () => controller.abort();
  }, [weekAttempt, weekUrl]);

  useEffect(() => {
    if (week.status !== "ready" || !selectedDay) return;

    const controller = new AbortController();
    setDay({ status: "loading" });
    const dayParams = new URLSearchParams(selectionQuery);
    dayParams.set("day", selectedDay);

    fetch(`/api/sabbath-school/day?${dayParams.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(readJson<SabbathDayContent>)
      .then((data) => {
        if (controller.signal.aborted) return;
        setDay({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDay({
          status: "error",
          message: errorMessage(error, "That day’s reading could not be loaded."),
        });
      });

    return () => controller.abort();
  }, [week, selectedDay, dayAttempt, selectionQuery]);

  if (week.status === "loading") {
    return (
      <section className="card flex min-h-[18rem] flex-col items-center justify-center gap-3 bg-paper p-8 text-center">
        <LoaderCircle className="size-6 animate-spin text-burgundy" aria-hidden />
        <p className="text-sm text-muted" role="status">
          Loading the lesson…
        </p>
      </section>
    );
  }

  if (week.status === "error") {
    return (
      <section className="card flex min-h-[18rem] flex-col items-center justify-center gap-3 bg-paper p-8 text-center">
        <p className="font-serif text-xl text-ink">The lesson is unavailable right now</p>
        <p className="max-w-md text-sm leading-relaxed text-muted">{week.message}</p>
        <button
          type="button"
          onClick={() => setWeekAttempt((attempt) => attempt + 1)}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Try again
        </button>
      </section>
    );
  }

  const lesson = week.data;

  return (
    <section className="card overflow-hidden bg-paper">
      <header
        className={
          showHeader
            ? "border-b border-rule bg-parchment px-5 py-5 md:px-6"
            : "hidden"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium tracking-[0.1em] text-burgundy uppercase">
              {quarterId && lessonId
                ? "Sabbath School · Lesson reader"
                : "Sabbath School · Current week"}
            </p>
            <h2 className="mt-1.5 font-serif text-[1.65rem] leading-tight text-ink">
              {lesson.lesson.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Lesson {lesson.lesson.number} · {lesson.quarter.title} ·{" "}
              {lesson.lesson.dateRange}
            </p>
          </div>
          <a
            href={lesson.lesson.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm shrink-0"
          >
            Official guide
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </header>

      <div className="grid lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="border-b border-rule p-4 lg:border-r lg:border-b-0 lg:p-5">
          <div className="lg:hidden">
            <label
              htmlFor={selectId}
              className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase"
            >
              Day
            </label>
            <select
              id={selectId}
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink outline-none focus:border-rule-strong"
            >
              {lesson.days.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} · {entry.date}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:block">
            <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
              This week
            </p>
            <div className="mt-2 space-y-1" role="tablist" aria-label="Lesson days">
              {lesson.days.map((entry) => {
                const active = entry.id === selectedDay;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedDay(entry.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-burgundy/30 bg-burgundy-tint text-burgundy"
                        : "border-transparent text-ink-soft hover:border-rule hover:bg-surface"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{entry.label}</span>
                      {entry.isToday ? (
                        <span className="text-[0.58rem] font-medium tracking-wide uppercase">
                          Today
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] text-muted">
                      {entry.date}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div
          className="min-w-0 p-5 md:p-7"
          aria-busy={day.status === "loading"}
          aria-live="polite"
        >
          {day.status === "loading" ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="size-5 animate-spin text-burgundy" aria-hidden />
              <p className="text-sm text-muted">Loading the reading…</p>
            </div>
          ) : day.status === "error" ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 text-center">
              <p className="font-serif text-lg text-ink">This reading could not be loaded</p>
              <p className="max-w-md text-sm leading-relaxed text-muted">{day.message}</p>
              <button
                type="button"
                onClick={() => setDayAttempt((attempt) => attempt + 1)}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Try again
              </button>
            </div>
          ) : (
            <article className="page-in">
              <p className="text-[0.68rem] font-medium tracking-[0.1em] text-muted uppercase">
                {day.data.label} · {day.data.date}
              </p>
              <h3 className="mt-1 font-serif text-[1.5rem] leading-tight text-ink">
                {day.data.title}
              </h3>
              {/* Content is normalised and sanitised by lib/adventech.ts. */}
              <div
                className="sabbath-prose mt-5"
                dangerouslySetInnerHTML={{ __html: day.data.contentHtml }}
              />
            </article>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface/40 px-5 py-3 text-[0.68rem] leading-relaxed text-muted md:px-6">
        <p className="max-w-xl">{lesson.source.note}</p>
        <a
          href={lesson.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-burgundy hover:underline"
        >
          absg.adventist.org
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </footer>
    </section>
  );
}