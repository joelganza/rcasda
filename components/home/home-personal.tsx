"use client";

import { ArrowRight, BookOpen, Music4 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useLibrary } from "@/lib/library";
import { PHOTOS } from "@/lib/photos";

export function ContinueReadingCard() {
  const { ready, snapshot } = useLibrary();
  const latest = snapshot.history[0];

  if (!ready) {
    return (
      <div className="card flex h-full flex-col overflow-hidden border-rule bg-paper">
        <CardPhoto />
        <p className="p-5 text-sm text-muted">Loading your reading history…</p>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="card group flex h-full flex-col overflow-hidden border-rule bg-paper">
        <CardPhoto />
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 text-burgundy">
              <BookOpen className="size-4" aria-hidden />
              <span className="text-[0.68rem] font-medium tracking-[0.1em] uppercase">
                Continue reading
              </span>
            </div>
            <h3 className="mt-2 font-serif text-xl text-ink">Start reading</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Pick up where you left off.
            </p>
          </div>
          <Link
            href="/bible"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy hover:underline"
          >
            Open the Bible
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card group flex h-full flex-col overflow-hidden border-rule bg-paper">
      <CardPhoto />
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.08em] text-burgundy uppercase">
            <BookOpen className="size-3.5" aria-hidden />
            Continue reading
          </p>
          <h3 className="mt-1.5 font-serif text-xl leading-snug text-ink">
            {latest.title}
          </h3>
          {latest.subtitle ? (
            <p className="mt-0.5 text-sm text-muted">{latest.subtitle}</p>
          ) : null}
        </div>
        <Link
          href={latest.href}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy hover:underline"
        >
          Resume
          <ArrowRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

function CardPhoto() {
  return (
    <div className="card-media relative aspect-[16/10] overflow-hidden bg-surface">
      <Image
        src={PHOTOS.library.src}
        alt={PHOTOS.library.alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        style={{
          objectPosition: PHOTOS.library.position,
        }}
      />
    </div>
  );
}

export function RecentHymns() {
  const { ready, snapshot } = useLibrary();
  const hymns = snapshot.history.filter((entry) => entry.kind === "hymn").slice(0, 4);

  if (!ready || hymns.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Recently opened hymns will appear here.{" "}
        <Link href="/hymnal" className="text-burgundy hover:underline">
          Browse
        </Link>
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rule">
      {hymns.map((hymn) => (
        <li key={hymn.clientId}>
          <Link
            href={hymn.href}
            className="flex items-center gap-3 py-2.5 text-sm text-ink-soft transition-colors hover:text-burgundy"
          >
            <Music4 className="size-3.5 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{hymn.title}</span>
              {hymn.subtitle ? (
                <span className="block truncate text-xs text-muted">
                  {hymn.subtitle}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
