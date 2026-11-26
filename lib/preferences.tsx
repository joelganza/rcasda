"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReaderFont, Theme } from "./types";

const STORAGE_KEY = "rca-sda:preferences";

export const MIN_READER_SIZE = 16;
export const MAX_READER_SIZE = 26;
export const READER_STEP = 1;

type Prefs = {
  theme: Theme;
  readerSize: number;
  readerFont: ReaderFont;
  sideBySide: boolean;
};

const DEFAULTS: Prefs = {
  theme: "light",
  readerSize: 19,
  readerFont: "serif",
  sideBySide: false,
};

type PreferencesContextValue = {
  prefs: Prefs;
  setTheme: (theme: Theme) => void;
  setReaderFont: (font: ReaderFont) => void;
  changeReaderSize: (delta: number) => void;
  setReaderSize: (size: number) => void;
  setSideBySide: (value: boolean) => void;
  reset: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "sepia" || value === "dark";
}

function isReaderFont(value: unknown): value is ReaderFont {
  return value === "serif" || value === "sans" || value === "kinyarwanda";
}

export function readStoredPreferences(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULTS.theme,
      readerSize:
        typeof parsed.readerSize === "number"
          ? Math.min(MAX_READER_SIZE, Math.max(MIN_READER_SIZE, parsed.readerSize))
          : DEFAULTS.readerSize,
      readerFont: isReaderFont(parsed.readerFont)
        ? parsed.readerFont
        : DEFAULTS.readerFont,
      sideBySide: Boolean(parsed.sideBySide),
    };
  } catch {
    return DEFAULTS;
  }
}

export function applyPreferences(prefs: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.readerFont = prefs.readerFont;
  root.style.setProperty("--reader-size", `${prefs.readerSize / 16}rem`);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    const stored = readStoredPreferences();
    setPrefs(stored);
    applyPreferences(stored);
  }, []);

  const persist = useCallback((next: Prefs) => {
    setPrefs(next);
    applyPreferences(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in private modes; the session still works.
    }
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      setTheme: (theme) => persist({ ...prefs, theme }),
      setReaderFont: (readerFont) => persist({ ...prefs, readerFont }),
      setReaderSize: (size) =>
        persist({
          ...prefs,
          readerSize: Math.min(MAX_READER_SIZE, Math.max(MIN_READER_SIZE, size)),
        }),
      changeReaderSize: (delta) =>
        persist({
          ...prefs,
          readerSize: Math.min(
            MAX_READER_SIZE,
            Math.max(MIN_READER_SIZE, prefs.readerSize + delta),
          ),
        }),
      setSideBySide: (sideBySide) => persist({ ...prefs, sideBySide }),
      reset: () => persist(DEFAULTS),
    }),
    [persist, prefs],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}

/** Inlined in <head> so the chosen theme paints before React hydrates. */
export const themeBootstrapScript = `(function(){try{var p=JSON.parse(localStorage.getItem("${STORAGE_KEY}")||"{}");var t=p.theme;if(t!=="light"&&t!=="sepia"&&t!=="dark")t="light";document.documentElement.dataset.theme=t;var f=p.readerFont;document.documentElement.dataset.readerFont=f==="sans"?"sans":f==="kinyarwanda"?"kinyarwanda":"serif";if(typeof p.readerSize==="number")document.documentElement.style.setProperty("--reader-size",(p.readerSize/16)+"rem");}catch(e){}})();`;
