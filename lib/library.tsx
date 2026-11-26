"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { verseRefKey } from "./routes";
import {
  EMPTY_LIBRARY,
  type HistoryEntry,
  type LibrarySnapshot,
  type SavedItem,
  type SavedKind,
  type SavedType,
  type SessionUser,
  type VerseRef,
} from "./types";

const MAX_HISTORY = 40;

type SyncState = "idle" | "saving" | "synced" | "offline";

type NewSavedItem = {
  type: SavedType;
  kind: SavedKind;
  title: string;
  subtitle?: string;
  body?: string;
  href: string;
  ref?: VerseRef;
};

type LibraryContextValue = {
  ready: boolean;
  snapshot: LibrarySnapshot;
  syncState: SyncState;
  itemFor: (key: string) => SavedItem | undefined;
  isSaved: (key: string) => boolean;
  toggleSaved: (key: string, item: NewSavedItem) => void;
  saveItem: (key: string, item: NewSavedItem) => void;
  removeItem: (key: string) => void;
  itemsOfType: (type: SavedType) => SavedItem[];
  recordHistory: (entry: Omit<HistoryEntry, "updatedAt">) => void;
  clearHistory: () => void;
  isDayComplete: (lessonId: string, dayIndex: number) => boolean;
  toggleLessonDay: (lessonId: string, dayIndex: number) => void;
  completedDays: (lessonId: string) => number[];
  isPlanDayComplete: (planId: string, day: number) => boolean;
  togglePlanDay: (planId: string, day: number) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function storageKey(userId: string | null) {
  return `rca-sda:library:${userId ?? "guest"}`;
}

function mergeSnapshots(
  local: LibrarySnapshot,
  server: LibrarySnapshot,
): LibrarySnapshot {
  const items = new Map<string, SavedItem>();
  for (const item of [...server.items, ...local.items]) {
    const existing = items.get(item.clientId);
    if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt)) {
      items.set(item.clientId, item);
    }
  }

  const history = new Map<string, HistoryEntry>();
  for (const entry of [...server.history, ...local.history]) {
    const existing = history.get(entry.clientId);
    if (!existing || new Date(entry.updatedAt) >= new Date(existing.updatedAt)) {
      history.set(entry.clientId, entry);
    }
  }

  const lessonProgress = new Map<string, (typeof server.lessonProgress)[number]>();
  for (const entry of [...server.lessonProgress, ...local.lessonProgress]) {
    lessonProgress.set(`${entry.lessonId}:${entry.dayIndex}`, entry);
  }

  const planProgress = new Map<string, (typeof server.planProgress)[number]>();
  for (const entry of [...server.planProgress, ...local.planProgress]) {
    planProgress.set(`${entry.planId}:${entry.day}`, entry);
  }

  return {
    items: [...items.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    history: [...history.values()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_HISTORY),
    lessonProgress: [...lessonProgress.values()],
    planProgress: [...planProgress.values()],
  };
}

function readLocal(key: string): LibrarySnapshot {
  if (typeof window === "undefined") return EMPTY_LIBRARY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_LIBRARY;
    const parsed = JSON.parse(raw) as Partial<LibrarySnapshot>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      lessonProgress: Array.isArray(parsed.lessonProgress)
        ? parsed.lessonProgress
        : [],
      planProgress: Array.isArray(parsed.planProgress) ? parsed.planProgress : [],
    };
  } catch {
    return EMPTY_LIBRARY;
  }
}

function writeLocal(key: string, snapshot: LibrarySnapshot) {
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/private-mode failures; the in-memory state still works.
  }
}

export function LibraryProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY_LIBRARY);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const key = storageKey(user?.id ?? null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = readLocal(key);
    setSnapshot(local);
    setReady(true);

    if (!user) {
      setSyncState("idle");
      return;
    }

    let cancelled = false;
    setSyncState("saving");

    (async () => {
      try {
        const response = await fetch("/api/library", { cache: "no-store" });
        if (!response.ok) throw new Error("offline");
        const server = (await response.json()) as LibrarySnapshot;
        const merged = mergeSnapshots(local, server);
        if (cancelled) return;
        setSnapshot(merged);
        writeLocal(key, merged);

        const saved = await fetch("/api/library", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
        });
        if (!saved.ok) throw new Error("offline");
        const confirmed = (await saved.json()) as LibrarySnapshot;
        if (cancelled) return;
        setSnapshot(confirmed);
        writeLocal(key, confirmed);
        setSyncState("synced");
      } catch {
        if (!cancelled) setSyncState("offline");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, user]);

  const scheduleSync = useCallback(
    (next: LibrarySnapshot) => {
      if (!user) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      setSyncState("saving");
      syncTimer.current = setTimeout(() => {
        fetch("/api/library", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((merged: LibrarySnapshot) => {
            setSnapshot(merged);
            writeLocal(key, merged);
            setSyncState("synced");
          })
          .catch(() => setSyncState("offline"));
      }, 600);
    },
    [key, user],
  );

  const update = useCallback(
    (updater: (previous: LibrarySnapshot) => LibrarySnapshot) => {
      setSnapshot((previous) => {
        const next = updater(previous);
        writeLocal(key, next);
        scheduleSync(next);
        return next;
      });
    },
    [key, scheduleSync],
  );

  const saveItem = useCallback(
    (itemKey: string, item: NewSavedItem) => {
      const now = new Date().toISOString();
      update((previous) => {
        const existing = previous.items.find((entry) => entry.clientId === itemKey);
        const nextItem: SavedItem = {
          clientId: itemKey,
          type: item.type,
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          body: item.body ?? existing?.body,
          href: item.href,
          ref: item.ref,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        return {
          ...previous,
          items: [nextItem, ...previous.items.filter((e) => e.clientId !== itemKey)],
        };
      });
    },
    [update],
  );

  const removeItem = useCallback(
    (itemKey: string) => {
      update((previous) => ({
        ...previous,
        items: previous.items.filter((entry) => entry.clientId !== itemKey),
      }));
    },
    [update],
  );

  const toggleSaved = useCallback(
    (itemKey: string, item: NewSavedItem) => {
      if (snapshot.items.some((entry) => entry.clientId === itemKey)) {
        removeItem(itemKey);
      } else {
        saveItem(itemKey, item);
      }
    },
    [removeItem, saveItem, snapshot.items],
  );

  const recordHistory = useCallback(
    (entry: Omit<HistoryEntry, "updatedAt">) => {
      const now = new Date().toISOString();
      update((previous) => {
        const others = previous.history.filter(
          (item) => item.clientId !== entry.clientId,
        );
        return {
          ...previous,
          history: [{ ...entry, updatedAt: now }, ...others].slice(0, MAX_HISTORY),
        };
      });
    },
    [update],
  );

  const toggleLessonDay = useCallback(
    (lessonId: string, dayIndex: number) => {
      update((previous) => {
        const exists = previous.lessonProgress.some(
          (entry) => entry.lessonId === lessonId && entry.dayIndex === dayIndex,
        );
        return {
          ...previous,
          lessonProgress: exists
            ? previous.lessonProgress.filter(
                (entry) =>
                  !(entry.lessonId === lessonId && entry.dayIndex === dayIndex),
              )
            : [
                ...previous.lessonProgress,
                { lessonId, dayIndex, completedAt: new Date().toISOString() },
              ],
        };
      });
    },
    [update],
  );

  const togglePlanDay = useCallback(
    (planId: string, day: number) => {
      update((previous) => {
        const exists = previous.planProgress.some(
          (entry) => entry.planId === planId && entry.day === day,
        );
        return {
          ...previous,
          planProgress: exists
            ? previous.planProgress.filter(
                (entry) => !(entry.planId === planId && entry.day === day),
              )
            : [
                ...previous.planProgress,
                { planId, day, completedAt: new Date().toISOString() },
              ],
        };
      });
    },
    [update],
  );

  const value = useMemo<LibraryContextValue>(() => {
    const itemFor = (itemKey: string) =>
      snapshot.items.find((entry) => entry.clientId === itemKey);
    return {
      ready,
      snapshot,
      syncState,
      itemFor,
      isSaved: (itemKey) => Boolean(itemFor(itemKey)),
      toggleSaved,
      saveItem,
      removeItem,
      itemsOfType: (type) => snapshot.items.filter((entry) => entry.type === type),
      recordHistory,
      clearHistory: () => update((previous) => ({ ...previous, history: [] })),
      isDayComplete: (lessonId, dayIndex) =>
        snapshot.lessonProgress.some(
          (entry) => entry.lessonId === lessonId && entry.dayIndex === dayIndex,
        ),
      toggleLessonDay,
      completedDays: (lessonId) =>
        snapshot.lessonProgress
          .filter((entry) => entry.lessonId === lessonId)
          .map((entry) => entry.dayIndex),
      isPlanDayComplete: (planId, day) =>
        snapshot.planProgress.some(
          (entry) => entry.planId === planId && entry.day === day,
        ),
      togglePlanDay,
    };
  }, [
    ready,
    recordHistory,
    saveItem,
    snapshot,
    removeItem,
    syncState,
    toggleLessonDay,
    togglePlanDay,
    update,
    toggleSaved,
  ]);

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used inside LibraryProvider");
  }
  return context;
}

export function verseItemKey(ref: VerseRef) {
  return `verse:${verseRefKey(ref)}`;
}
