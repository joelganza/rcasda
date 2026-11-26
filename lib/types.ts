export type Theme = "light" | "sepia" | "dark";
export type ReaderFont = "serif" | "sans" | "kinyarwanda";

export type SavedType = "bookmark" | "favorite" | "note";
export type SavedKind = "verse" | "passage" | "hymn" | "lesson" | "day" | "plan";

export type VerseRef = {
  translationId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  endVerse?: number;
};

export type SavedItem = {
  clientId: string;
  type: SavedType;
  kind: SavedKind;
  title: string;
  subtitle?: string;
  body?: string;
  href: string;
  ref?: VerseRef;
  createdAt: string;
  updatedAt: string;
};

export type HistoryEntry = {
  clientId: string;
  kind: SavedKind;
  title: string;
  subtitle?: string;
  href: string;
  ref?: VerseRef;
  updatedAt: string;
};

export type LessonProgressEntry = {
  lessonId: string;
  dayIndex: number;
  completedAt: string;
};

export type PlanProgressEntry = {
  planId: string;
  day: number;
  completedAt: string;
};

export type LibrarySnapshot = {
  items: SavedItem[];
  history: HistoryEntry[];
  lessonProgress: LessonProgressEntry[];
  planProgress: PlanProgressEntry[];
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export const EMPTY_LIBRARY: LibrarySnapshot = {
  items: [],
  history: [],
  lessonProgress: [],
  planProgress: [],
};
