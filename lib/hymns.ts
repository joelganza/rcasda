import type { Prisma } from "@prisma/client";

import { db } from "./db";

export type HymnSummary = {
  id: number;
  number: number;
  title: string;
  firstLine: string;
  author: string | null;
  languageCode: string;
};

export const HYMNS_PER_PAGE = 40;

/**
 * A collection can be listed even when its text is unavailable. The pages read
 * `verificationStatus` and show the availability note instead of inventing
 * lyrics.
 */
export async function getHymnCollections() {
  return db.hymnCollection.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getHymnCollection(id: string) {
  return db.hymnCollection.findUnique({ where: { id } });
}

export async function getAvailableCollection(id: string) {
  const collection = await getHymnCollection(id);
  if (!collection || collection.verificationStatus !== "VERIFIED") return null;
  return collection;
}

export async function listHymns(
  collectionId: string,
  options: { query?: string; page?: number; perPage?: number } = {},
) {
  const perPage = Math.min(100, Math.max(10, options.perPage ?? HYMNS_PER_PAGE));
  const page = Math.max(1, options.page ?? 1);
  const query = options.query?.trim() ?? "";

  const where: Prisma.HymnWhereInput = {
    collectionId,
    ...(query
      ? /^\d{1,4}$/.test(query)
        ? { number: Number(query) }
        : {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { firstLine: { contains: query, mode: "insensitive" } },
              { author: { contains: query, mode: "insensitive" } },
            ],
          }
      : {}),
  };

  const [total, hymns] = await Promise.all([
    db.hymn.count({ where }),
    db.hymn.findMany({
      where,
      orderBy: { number: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        number: true,
        title: true,
        firstLine: true,
        author: true,
        languageCode: true,
      },
    }),
  ]);

  return {
    hymns: hymns satisfies HymnSummary[],
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
    query,
  };
}

export async function getHymn(collectionId: string, number: number) {
  return db.hymn.findUnique({
    where: { collectionId_number: { collectionId, number } },
    include: {
      collection: true,
      stanzas: { orderBy: { order: "asc" } },
    },
  });
}

export async function getHymnNeighbours(collectionId: string, number: number) {
  const [previous, next] = await Promise.all([
    db.hymn.findFirst({
      where: { collectionId, number: { lt: number } },
      orderBy: { number: "desc" },
      select: { number: true, title: true },
    }),
    db.hymn.findFirst({
      where: { collectionId, number: { gt: number } },
      orderBy: { number: "asc" },
      select: { number: true, title: true },
    }),
  ]);
  return { previous, next };
}

/** A small, deterministic selection for the hymnal landing page. */
export async function getFeaturedHymns(limit = 6) {
  const collection = await db.hymnCollection.findFirst({
    where: { verificationStatus: "VERIFIED", hymnCount: { gt: 0 } },
    orderBy: { sortOrder: "asc" },
  });
  if (!collection) return { collection: null, hymns: [] as HymnSummary[] };

  const hymns = await db.hymn.findMany({
    where: { collectionId: collection.id },
    orderBy: { number: "asc" },
    take: limit,
    select: {
      id: true,
      number: true,
      title: true,
      firstLine: true,
      author: true,
      languageCode: true,
    },
  });
  return { collection, hymns };
}
