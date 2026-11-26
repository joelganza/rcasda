import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const data = new Uint8Array(readFileSync("bibiliya.pdf"));
const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
const fonts = new Map();
const lines = [];
const failures = [];

function joinItems(items) {
  let out = "";
  for (const item of items) {
    const value = item.str;
    if (!value) continue;
    if (!out) {
      out = value;
    } else if (/\s$/.test(out) || /^\s/.test(value)) {
      out += value;
    } else {
      out += ` ${value}`;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
  let page;
  let content;
  try {
    page = await doc.getPage(pageNumber);
    content = await page.getTextContent();
  } catch (error) {
    failures.push({ page: pageNumber, error: String(error?.message ?? error) });
    console.error(`page ${pageNumber} failed: ${error?.message ?? error}`);
    continue;
  }
  const rows = new Map();
  for (const item of content.items) {
    if (!("str" in item) || !item.str) continue;
    const y = item.transform[5];
    let row = null;
    for (const candidate of rows.values()) {
      if (Math.abs(candidate.y - y) <= 1.5) {
        row = candidate;
        break;
      }
    }
    if (!row) {
      row = { y, items: [] };
      rows.set(`${Math.round(y * 10)}`, row);
    }
    row.items.push(item);
    const font = item.fontName ?? "unknown";
    const entry = fonts.get(font) ?? { count: 0, heights: new Map(), samples: [] };
    entry.count += item.str.length;
    entry.heights.set(item.height.toFixed(2), (entry.heights.get(item.height.toFixed(2)) ?? 0) + item.str.length);
    if (entry.samples.length < 4) entry.samples.push(item.str.slice(0, 80));
    fonts.set(font, entry);
  }

  for (const row of [...rows.values()].sort((a, b) => b.y - a.y)) {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    const text = joinItems(row.items);
    if (!text) continue;
    const dominant = row.items
      .filter((item) => item.str)
      .sort((a, b) => b.str.length - a.str.length)[0];
    lines.push({
      page: pageNumber,
      y: Math.round(row.y * 10) / 10,
      font: dominant.fontName ?? "unknown",
      size: Math.round(dominant.height * 100) / 100,
      text,
    });
  }
  if (pageNumber % 250 === 0) console.error(`page ${pageNumber}/${doc.numPages}, lines ${lines.length}`);
  page.cleanup();
}

writeFileSync("content/cache/kinyarwanda-lines.jsonl", `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`);
writeFileSync("content/cache/kinyarwanda-failures.json", `${JSON.stringify(failures, null, 2)}\n`);
writeFileSync(
  "content/cache/kinyarwanda-fonts.json",
  `${JSON.stringify(
    [...fonts].map(([font, entry]) => ({
      font,
      count: entry.count,
      heights: [...entry.heights].sort((a, b) => b[1] - a[1]).slice(0, 5),
      samples: entry.samples,
    })),
    null,
    2,
  )}\n`,
);
console.log(`pages ${doc.numPages}, lines ${lines.length}`);
