"use client";

import { Minus, Moon, Plus, SlidersHorizontal, SunMedium } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  MAX_READER_SIZE,
  MIN_READER_SIZE,
  usePreferences,
} from "@/lib/preferences";
import type { ReaderFont, Theme } from "@/lib/types";

const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#ffffff" },
  { id: "sepia", label: "Sepia", swatch: "#f2e8d5" },
  { id: "dark", label: "Dark", swatch: "#1b1716" },
];

const FONTS: { id: ReaderFont; label: string; className: string }[] = [
  { id: "serif", label: "Literary", className: "font-serif" },
  { id: "sans", label: "Clean", className: "font-sans" },
  { id: "kinyarwanda", label: "Kinyarwanda", className: "font-kinyarwanda" },
];

export function DisplayMenu({ compact = false }: { compact?: boolean }) {
  const { prefs, setTheme, setReaderFont, changeReaderSize } = usePreferences();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-lg border border-rule px-2.5 py-2 text-sm text-ink-soft transition-colors hover:border-rule-strong hover:text-ink ${
          compact ? "" : "md:px-3"
        }`}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        <span className="hidden md:inline">Reading</span>
        <span className="sr-only">Reading preferences</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Reading preferences"
          className="absolute right-0 z-50 mt-2 w-[19rem] card border-rule bg-paper p-4 shadow-[var(--shadow-soft)]"
        >
          <p className="text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
            Text size
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => changeReaderSize(-1)}
              disabled={prefs.readerSize <= MIN_READER_SIZE}
              className="flex size-9 items-center justify-center rounded-full border border-rule text-ink-soft hover:border-rule-strong disabled:opacity-40"
              aria-label="Decrease text size"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <div className="h-1.5 flex-1 rounded-full bg-surface">
              <div
                className="h-1.5 rounded-full bg-burgundy"
                style={{
                  width: `${
                    ((prefs.readerSize - MIN_READER_SIZE) /
                      (MAX_READER_SIZE - MIN_READER_SIZE)) *
                    100
                  }%`,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => changeReaderSize(1)}
              disabled={prefs.readerSize >= MAX_READER_SIZE}
              className="flex size-9 items-center justify-center rounded-full border border-rule text-ink-soft hover:border-rule-strong disabled:opacity-40"
              aria-label="Increase text size"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>

          <p className="mt-5 text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
            Reading font
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setReaderFont(font.id)}
                aria-pressed={prefs.readerFont === font.id}
                className={`rounded-lg border px-2 py-2 text-[0.78rem] transition-colors ${font.className} ${
                  prefs.readerFont === font.id
                    ? "border-burgundy bg-burgundy-tint text-ink"
                    : "border-rule text-ink-soft hover:border-rule-strong"
                }`}
              >
                {font.label}
              </button>
            ))}
          </div>

          <p className="mt-5 text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
            Appearance
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                aria-pressed={prefs.theme === theme.id}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 text-[0.78rem] transition-colors ${
                  prefs.theme === theme.id
                    ? "border-burgundy bg-burgundy-tint text-ink"
                    : "border-rule text-ink-soft hover:border-rule-strong"
                }`}
              >
                <span
                  className="size-5 rounded-full border border-black/10"
                  style={{ backgroundColor: theme.swatch }}
                  aria-hidden
                />
                {theme.label}
              </button>
            ))}
          </div>

          <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-muted">
            Saved on this device.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ThemeToggle() {
  const { prefs, setTheme } = usePreferences();
  const next: Theme = prefs.theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex size-9 items-center justify-center rounded-full border border-rule text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
      aria-label={prefs.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={prefs.theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {prefs.theme === "dark" ? (
        <SunMedium className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
