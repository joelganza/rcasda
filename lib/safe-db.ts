type DatabaseConnectionError = {
  name?: unknown;
  code?: unknown;
  errorCode?: unknown;
  cause?: unknown;
};

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as DatabaseConnectionError;
  return (
    candidate.name === "PrismaClientInitializationError" ||
    candidate.code === "P1001" ||
    candidate.code === "P2024" ||
    candidate.errorCode === "P1001" ||
    candidate.errorCode === "P2024" ||
    isDatabaseUnavailable(candidate.cause)
  );
}

export async function safeDb<T, F>(fn: () => Promise<T>, fallback: F): Promise<T | F> {
  try {
    return await fn();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    console.error("Database temporarily unavailable (Prisma connection/pool error)");
    return fallback;
  }
}
