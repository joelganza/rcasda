"use client";

import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { useLibrary } from "@/lib/library";

type PlanDay = {
  day: number;
  passages: { label: string; href: string }[];
};

export function PlanTracker({
  planId,
  slug,
  title,
  days,
}: {
  planId: string;
  slug: string;
  title: string;
  days: PlanDay[];
}) {
  const { ready, isPlanDayComplete, togglePlanDay, snapshot, recordHistory } =
    useLibrary();
  const completed = snapshot.planProgress.filter((entry) => entry.planId === planId);
  const href = `/plans/${slug}`;

  useEffect(() => {
    recordHistory({
      clientId: `plan:${planId}`,
      kind: "plan",
      title,
      subtitle: `${days.length} days`,
      href,
    });
  }, [days.length, href, planId, recordHistory, title]);

  return (
    <div>
      <div className="sticky top-16 z-10 -mx-4 border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-surface">
            <div
              className="h-1.5 rounded-full bg-gold transition-[width]"
              style={{ width: `${Math.min(100, (completed.length / days.length) * 100)}%` }}
            />
          </div>
          <p className="text-xs tabular-nums text-muted">
            {completed.length} / {days.length} days
          </p>
        </div>
        {!ready ? <p className="mt-1 text-xs text-muted">Loading your progress…</p> : null}
      </div>

      <ol className="mt-4 divide-y divide-rule overflow-hidden card border-rule bg-paper">
        {days.map((entry) => {
          const done = isPlanDayComplete(planId, entry.day);
          return (
            <li key={entry.day} className="flex items-start gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => togglePlanDay(planId, entry.day)}
                aria-pressed={done}
                aria-label={
                  done
                    ? `Mark day ${entry.day} as not complete`
                    : `Mark day ${entry.day} as complete`
                }
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-rule-strong text-transparent hover:border-burgundy"
                }`}
              >
                <Check className="size-3.5" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`text-sm ${done ? "text-muted line-through" : "text-ink"}`}>
                    Day {entry.day}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {entry.passages.map((passage) => (
                      <Link
                        key={passage.label}
                        href={passage.href}
                        className="inline-flex items-center gap-1 text-xs text-burgundy hover:underline"
                      >
                        {passage.label}
                        <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
