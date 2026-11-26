/**
 * Runs every content importer in dependency order. Each step validates its own
 * source before writing, and a failure stops the chain instead of leaving a
 * half-published library.
 *
 * Usage: npm run ingest:all
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const hasKinyarwandaBible = existsSync("bibiliya.pdf");
const hasKinyarwandaHymns = existsSync(
  "Indirimbo_Zo_Guhimbaza_Imana_za_500_SDA_compressed-1.pdf",
);

const STEPS = [
  "scripts/ingest-bible.ts",
  "scripts/ingest-hymns.ts",
  "scripts/seed-catalog.ts",
];

if (hasKinyarwandaBible) STEPS.push("scripts/ingest-kinyarwanda.ts");
if (hasKinyarwandaHymns) STEPS.push("scripts/ingest-kinyarwanda-hymns.ts");
STEPS.push("scripts/sync-quarter.ts");

const PARSERS = [];
if (hasKinyarwandaBible) {
  PARSERS.push({
    script: "scripts/parse-kinyarwanda.mjs",
    label: "Kinyarwanda Bible",
  });
}
if (hasKinyarwandaHymns) {
  PARSERS.push({
    script: "scripts/parse-kinyarwanda-hymnal.mjs",
    label: "Kinyarwanda hymnal",
  });
}

for (const { script, label } of PARSERS) {
  console.log(`\n▶ ${script}`);
  const parse = spawnSync(process.execPath, [script], {
    stdio: "inherit",
  });
  if (parse.status !== 0) {
    console.error(`\nStopped: ${label} PDF extraction failed.`);
    process.exit(parse.status ?? 1);
  }
}

for (const step of STEPS) {
  console.log(`\n▶ ${step}`);
  const result = spawnSync("npx", ["tsx", step], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\nStopped: ${step} failed.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll content importers completed.");
