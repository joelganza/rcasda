export type SearchCategory = "bible" | "hymnal" | "lesson";

export type SearchResult = {
  category: SearchCategory;
  id: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  href: string;
  meta?: string;
};

export type SearchGroup = {
  category: SearchCategory;
  label: string;
  results: SearchResult[];
  total: number;
};

export type SearchResponse = {
  query: string;
  groups: SearchGroup[];
  total: number;
  tookMs: number;
};

export const CATEGORY_LABELS: Record<SearchCategory, string> = {
  bible: "Bible",
  hymnal: "Hymnal",
  lesson: "Sabbath School",
};
