/**
 * Sabbath School synchronisation.
 *
 * Reads the current quarter and its lessons from the official Adventech API used
 * by absg.adventist.org, then stores titles, dates and official links. Full
 * lesson text is copyrighted and remains on the official site.
 *
 * Usage: npm run ingest:quarter
 */
import { db } from "../lib/db";
import { syncCurrentQuarter } from "../lib/sabbath";

async function main() {
  const result = await syncCurrentQuarter();
  console.log(
    `Synced ${result.title} (${result.quarterId}) — ${result.lessons} lessons.`,
  );
  console.log(`Official guide: ${result.officialUrl}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    await db.syncLog
      .create({
        data: {
          kind: "sabbath-school",
          status: "FAILED",
          message: "Sabbath School metadata sync failed.",
          detail: (error as Error).message,
        },
      })
      .catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
