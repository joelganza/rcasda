import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Ingestion and other long-running one-off operations can use Supabase's
    // session/direct pooler without changing the serverless runtime URL.
    ...(process.env.INGEST_DATABASE_URL
      ? { datasourceUrl: process.env.INGEST_DATABASE_URL }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = db;
