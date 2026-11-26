/**
 * The supplied Bibiliya Yera PDF is damaged in a few places and carries some
 * cross-reference notes that look like verse numbers. This script compares the
 * PDF chapters with the same Kinyarwanda text at bibiliya.com and writes full
 * chapters only where the PDF is missing verses.
 *
 * It is a one-off recovery tool; the generated supplement is committed so the
 * importer itself does not need the network.
 */
import { readFileSync, writeFileSync } from "node:fs";

const parsed = JSON.parse(readFileSync("content/cache/kinyarwanda-parsed.json", "utf8"));
const kjv = JSON.parse(readFileSync("content/cache/kjv.json", "utf8"));
const existing = JSON.parse(readFileSync("scripts/kinyarwanda-supplement.json", "utf8"));

const SLUGS = {
  Gen: "itangiriro", Exod: "kuva", Lev: "abalewi", Num: "kubara",
  Deut: "gutegeka_kwa_kabiri", Josh: "yosuwa", Judg: "abacamanza", Ruth: "rusi",
  "1Sam": "1_samweli", "2Sam": "2_samweli", "1Kgs": "1_abami", "2Kgs": "2_abami",
  "1Chr": "1_ibyo_ku_ngoma", "2Chr": "2_ibyo_ku_ngoma", Ezra: "ezira",
  Neh: "nehemiya", Esth: "esiteri", Job: "yobu", Ps: "zaburi", Prov: "imigani",
  Eccl: "umubwiriza", Song: "indirimbo", Isa: "yesaya", Jer: "yeremiya",
  Lam: "amaganya", Ezek: "ezekiyeli", Dan: "daniyeli", Hos: "hoseya",
  Joel: "yoweli", Amos: "amosi", Obad: "obadiya", Jonah: "yona", Mic: "mika",
  Nah: "nahumu", Hab: "habakuki", Zeph: "zefaniya", Hag: "hagayi",
  Zech: "zekariya", Mal: "malaki", Matt: "matayo", Mark: "mariko", Luke: "luka",
  John: "yohana", Acts: "ibyakozwe_n_intumwa", Rom: "abaroma",
  "1Cor": "1_abakorinto", "2Cor": "2_abakorinto", Gal: "abagalatiya",
  Eph: "abefeso", Phil: "abafilipi", Col: "abakolosayi",
  "1Thess": "1_abatesalonike", "2Thess": "2_abatesalonike",
  "1Tim": "1_timoteyo", "2Tim": "2_timoteyo", Titus: "tito", Phlm: "filemoni",
  Heb: "abaheburayo", Jas: "yakobo", "1Pet": "1_petero", "2Pet": "2_petero",
  "1John": "1_yohana", "2John": "2_yohana", "3John": "3_yohana", Jude: "yuda",
  Rev: "ibyahishuwe",
};

function decode(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function versesFromHtml(html) {
  const verses = [];
  const re = /<div id='cont-(\d+)'[^>]*>(.*?)<\/div>/g;
  let match;
  while ((match = re.exec(html))) {
    verses.push({ number: Number(match[1]), text: decode(match[2]) });
  }
  return verses;
}

function chapterPages(pdfBook, chapter) {
  return pdfBook?.chapters.find((candidate) => candidate.number === chapter)?.verses ?? [];
}

const booksById = new Map(parsed.map((book) => [book.id, book]));
const supplement = {
  source: {
    name: "Bibiliya Yera online (same Kinyarwanda text)",
    url: "https://bibiliya.com/yera/",
    note: "Supplies chapters whose text is missing or damaged in the supplied PDF. Only the same Kinyarwanda text is used; no translation or generated verse is added.",
  },
  chapters: { ...existing.chapters },
};

const candidates = [];
for (const kjvBook of kjv.books) {
  const pdfBook = booksById.get(kjvBook.book);
  for (const kjvChapter of kjvBook.chapters) {
    const verses = chapterPages(pdfBook, kjvChapter.chapter);
    const expected = kjvChapter.verses.length;
    if (
      !pdfBook ||
      verses.length === 0 ||
      verses.length !== expected ||
      verses[0]?.number !== 1
    ) {
      candidates.push({
        book: kjvBook.book,
        chapter: kjvChapter.chapter,
        expected,
        found: verses.length,
        first: verses[0]?.number ?? null,
      });
    }
  }
}

console.log(`Candidates: ${candidates.length}`);
let repaired = 0;
let keptVersification = 0;

for (const [index, candidate] of candidates.entries()) {
  const slug = SLUGS[candidate.book];
  if (!slug) {
    console.error(`No site slug for ${candidate.book}`);
    continue;
  }
  const url = `https://bibiliya.com/yera/${slug}-${candidate.chapter}/`;
  let html;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (error) {
    console.error(`FAILED ${candidate.book} ${candidate.chapter}: ${error.message}`);
    continue;
  }

  const siteVerses = versesFromHtml(html);
  if (siteVerses.length === 0) {
    console.error(`EMPTY ${candidate.book} ${candidate.chapter}`);
    continue;
  }

  if (siteVerses.length !== candidate.found || candidate.first !== 1) {
    supplement.chapters[`${candidate.book}.${candidate.chapter}`] = siteVerses;
    repaired += 1;
    console.log(
      `REPAIRED ${candidate.book} ${candidate.chapter}: PDF ${candidate.found}${candidate.first !== 1 ? ` (starts ${candidate.first})` : ""} -> online ${siteVerses.length}`,
    );
  } else {
    keptVersification += 1;
  }

  if (index % 10 === 0) {
    console.log(`  progress ${index + 1}/${candidates.length}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

writeFileSync("scripts/kinyarwanda-supplement.json", `${JSON.stringify(supplement, null, 2)}\n`);
console.log(
  `Supplement chapters: ${Object.keys(supplement.chapters).length}; repaired ${repaired}; kept PDF versification ${keptVersification}.`,
);
