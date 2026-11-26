/**
 * Downloads the public-domain hymn corpus used by the hymn importer.
 * Kept separate so a slow connection can be resumed without touching the DB.
 *
 * Usage: tsx scripts/fetch-hymn-corpus.ts
 */
import path from "node:path";

import { download } from "./download";

const URL =
  "https://raw.githubusercontent.com/OpenChristianData/open-christian-data/main/data/hymns/hymnary-pd/collection.json";
const BYTES = 50_245_920;

download(URL, path.join(process.cwd(), "content", "cache", "hymnary.json"), BYTES)
  .then(() => console.log("Hymn corpus downloaded."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
