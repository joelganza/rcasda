/**
 * Extract the supplied Kinyarwanda SDA hymnal, which arrived as 560
 * single-page PDFs (cover, indexes, 500 hymns and back matter).
 *
 * The text layer is readable, so this script only reconstructs lines and
 * removes page furniture. It never rewords, translates or completes a hymn.
 *
 * Usage: node scripts/parse-kinyarwanda-hymnal.mjs
 * Output: content/cache/kinyarwanda-hymnal.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = process.cwd();
const PAGE_COUNT = 560;
const FIRST_HYMN_PAGE = 10;
const LAST_HYMN_PAGE = 550;
const PDF_PREFIX = "Indirimbo_Zo_Guhimbaza_Imana_za_500_SDA_compressed-";
const OUTPUT = path.join(ROOT, "content", "cache", "kinyarwanda-hymnal.json");
const REPORT = path.join(ROOT, "content", "cache", "kinyarwanda-hymnal-report.json");

function cleanLine(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function joinItems(items) {
  let out = "";
  let lastEnd = null;
  for (const item of items) {
    const value = item.str ?? "";
    if (!value) continue;
    const x = item.transform[4];
    const width = item.width ?? 0;
    if (out && lastEnd !== null && x - lastEnd > 1.5) out += " ";
    out += value;
    lastEnd = x + width;
  }
  return cleanLine(out);
}

function extractRows(content) {
  const rows = new Map();
  for (const item of content.items) {
    if (!("str" in item) || !item.str) continue;
    const y = item.transform[5];
    let row = null;
    for (const [key, value] of rows) {
      if (Math.abs(key - y) <= 1.5) {
        row = value;
        break;
      }
    }
    if (!row) {
      rows.set(y, []);
      row = rows.get(y);
    }
    row.push(item);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => {
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      return joinItems(items);
    })
    .filter(Boolean);
}

function parseHeader(line) {
  const match = line.match(/^\s*(\d{1,3})\s+(.+)$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (number < 1 || number > 500) return null;

  let title = match[2].replace(/^\d+\s+/, "").replace(/\s{2,}/g, " ").trim();
  if (!/[A-Za-zÀ-ÿ]/.test(title)) return null;
  if (/^(SDAH|CS|AH|CH|HL|GH|SSS)\b/.test(title)) return null;
  return { number, title };
}

function isContentStart(line) {
  return (
    /^\s*\d{1,3}\.\s+\S/.test(line) ||
    /^\s*(Gusubiramo|Refrain)\b/i.test(line)
  );
}

function isVerseStart(line) {
  return /^\s*(\d{1,3})\.\s*(.*)$/.test(line);
}

function isChorusStart(line) {
  return /^\s*(Gusubiramo|Refrain)\s*:?\s*/i.test(line);
}

function cleanContent(lines) {
  const start = lines.findIndex(isContentStart);
  if (start < 0) return [];

  const stanzas = [];
  let current = null;

  for (const raw of lines.slice(start)) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (/^\d{1,4}$/.test(line)) continue;
    if (/^(Fine|D\.?S\.?(\s+Al\s+Fine)?|Dal Segno)\s*$/i.test(line)) continue;

    if (isVerseStart(line)) {
      const match = line.match(/^\s*(\d{1,3})\.\s*(.*)$/);
      current = { kind: "verse", text: [match[2].trim()] };
      stanzas.push(current);
      continue;
    }

    if (isChorusStart(line)) {
      const match = line.match(/^\s*(Gusubiramo|Refrain)\s*:?\s*(.*)$/i);
      current = { kind: "chorus", text: [match[2].trim()] };
      stanzas.push(current);
      continue;
    }

    if (!current) continue;
    current.text.push(line);
  }

  return stanzas
    .map((stanza) => ({
      kind: stanza.kind,
      text: stanza.text.filter(Boolean).join("\n").trim(),
    }))
    .filter((stanza) => stanza.text.length > 0);
}

function firstLine(stanzas) {
  for (const stanza of stanzas) {
    const line = stanza.text.split("\n")[0]?.trim();
    if (line) return line;
  }
  return "";
}

async function extractPage(pageNumber) {
  const file = path.join(ROOT, `${PDF_PREFIX}${pageNumber}.pdf`);
  if (!existsSync(file)) {
    return { page: pageNumber, lines: [], error: "PDF missing" };
  }

  const data = new Uint8Array(readFileSync(file));
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    verbosity: 0,
  }).promise;
  try {
    if (doc.numPages !== 1) {
      return {
        page: pageNumber,
        lines: [],
        error: `Expected one page, found ${doc.numPages}`,
      };
    }
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const lines = extractRows(content);
    page.cleanup();
    return { page: pageNumber, lines };
  } finally {
    await doc.destroy();
  }
}

async function main() {
  const pages = [];
  const failures = [];

  for (let pageNumber = 1; pageNumber <= PAGE_COUNT; pageNumber += 1) {
    try {
      const result = await extractPage(pageNumber);
      if (result.error) failures.push(result);
      pages.push(result);
      if (pageNumber % 50 === 0) {
        console.error(`page ${pageNumber}/${PAGE_COUNT}`);
      }
    } catch (error) {
      failures.push({
        page: pageNumber,
        error: String(error?.message ?? error),
      });
    }
  }

  const hymns = [];
  let current = null;

  for (const page of pages) {
    if (page.page < FIRST_HYMN_PAGE || page.page > LAST_HYMN_PAGE) continue;
    if (page.lines.length === 0) continue;

    const header = parseHeader(page.lines[0]);
    if (header) {
      current = {
        number: header.number,
        title: header.title,
        pages: [page.page],
        lines: [...page.lines],
      };
      hymns.push(current);
      continue;
    }

    if (current) {
      current.pages.push(page.page);
      current.lines.push(...page.lines);
    }
  }

  const prepared = hymns.map((hymn) => {
    const stanzas = cleanContent(hymn.lines);
    return {
      number: hymn.number,
      title: hymn.title,
      firstLine: firstLine(stanzas),
      stanzas,
      pages: hymn.pages,
    };
  });

  const byNumber = new Map();
  for (const hymn of prepared) {
    const existing = byNumber.get(hymn.number);
    if (existing) {
      throw new Error(`Duplicate hymn number ${hymn.number}.`);
    }
    byNumber.set(hymn.number, hymn);
  }

  const missing = [];
  for (let number = 1; number <= 500; number += 1) {
    if (!byNumber.has(number)) missing.push(number);
  }
  const empty = prepared
    .filter((hymn) => hymn.stanzas.length === 0)
    .map((hymn) => hymn.number);
  const invalidTitles = prepared
    .filter((hymn) => hymn.title.length < 2)
    .map((hymn) => hymn.number);

  const ordered = [...byNumber.values()].sort((a, b) => a.number - b.number);
  const extracted = {
    title: "Indirimbo zo Guhimbaza Imana",
    languageCode: "rw",
    pageCount: PAGE_COUNT,
    hymns: ordered,
  };

  if (process.argv.includes("--check")) {
    if (missing.length || empty.length || invalidTitles.length || failures.length) {
      throw new Error(
        `PDF check failed: ${missing.length} missing, ${empty.length} empty, ${invalidTitles.length} invalid titles, ${failures.length} parser failures.`,
      );
    }
    const previous = JSON.parse(readFileSync(OUTPUT, "utf8"));
    if (!isDeepStrictEqual(previous, extracted)) {
      throw new Error(
        "The current PDF extraction differs from content/cache/kinyarwanda-hymnal.json.",
      );
    }
    console.log(
      `PDF check passed: ${ordered.length} hymns, ${ordered.reduce((sum, hymn) => sum + hymn.stanzas.length, 0)} stanzas; extraction matches the saved cache exactly. Text and rights still require human review.`,
    );
    return;
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify(extracted, null, 2)}\n`,
  );

  writeFileSync(
    REPORT,
    `${JSON.stringify(
      {
        pages: PAGE_COUNT,
        firstHymnPage: FIRST_HYMN_PAGE,
        lastHymnPage: LAST_HYMN_PAGE,
        extractedHymns: ordered.length,
        stanzas: ordered.reduce((sum, hymn) => sum + hymn.stanzas.length, 0),
        missing,
        empty,
        invalidTitles,
        failures,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Hymns ${ordered.length}, stanzas ${ordered.reduce(
      (sum, hymn) => sum + hymn.stanzas.length,
      0,
    )}, missing ${missing.length}, empty ${empty.length}, failures ${failures.length}`,
  );
  if (missing.length) console.log(`Missing numbers: ${missing.join(", ")}`);
  if (empty.length) console.log(`Empty numbers: ${empty.join(", ")}`);
  if (failures.length) console.log(`Failures: ${JSON.stringify(failures)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
