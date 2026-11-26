/**
 * Hymn ingestion.
 *
 * Imports the public-domain hymn corpus published by Hymnary.org (Calvin
 * University). It is a cross-denominational library of public-domain hymn
 * texts, NOT the official Seventh-day Adventist Hymnal. Catalogue numbers are
 * assigned by this platform so the texts can be referenced; they are not
 * official hymnal numbers.
 *
 * The official English SDA Hymnal is copyrighted and is recorded as UNAVAILABLE
 * with an explanation instead of being reconstructed or invented. The supplied
 * Kinyarwanda SDA hymnal is imported by its own importer.
 *
 * Usage: npm run ingest:hymns
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../lib/db";

type RawHymn = {
  entry_id: string;
  title: string;
  author: string | null;
  year_written: number | null;
  stanzas: string[];
  language: string;
  hymnal_title: string | null;
  hymnal_year: number | null;
  word_count: number;
};

type RawCorpus = {
  meta: {
    title: string;
    license: string;
    provenance?: { source_url?: string; source_edition?: string };
  };
  data: RawHymn[];
};

const CORPUS = path.join(process.cwd(), "content", "cache", "hymnary.json");
const COLLECTION_ID = "hymnary-pd-en";
const SOURCE_ID = "hymnary-pd";
const BATCH_SIZE = 1000;

function cleanStanza(value: string): { kind: string; text: string } {
  const trimmed = value.trim();
  if (/^(refrain|chorus)\b/i.test(trimmed)) {
    return {
      kind: "chorus",
      text: trimmed.replace(/^(refrain|chorus)\s*:\s*/i, "").trim(),
    };
  }
  return {
    kind: "verse",
    text: trimmed.replace(/^\d{1,3}\s+/, "").trim(),
  };
}

function firstLine(stanzas: string[]): string {
  for (const stanza of stanzas) {
    const cleaned = cleanStanza(stanza).text;
    if (cleaned) {
      const line = cleaned.split("\n")[0].trim();
      if (line) return line;
    }
  }
  return "";
}

async function main() {
  const corpus = JSON.parse(await readFile(CORPUS, "utf8")) as RawCorpus;
  if (!Array.isArray(corpus.data) || corpus.data.length === 0) {
    throw new Error("The hymn corpus is empty or unreadable.");
  }

  const english = corpus.data
    .filter((hymn) => hymn.language === "en")
    .filter((hymn) => hymn.title?.trim() && hymn.stanzas?.length > 0);

  if (english.length < 1_000) {
    throw new Error(
      `Only ${english.length} English hymns found — refusing to publish an incomplete library.`,
    );
  }

  console.log(`Preparing ${english.length} English public-domain hymns…`);

  const prepared = english
    .map((hymn, index) => {
      const stanzas = hymn.stanzas
        .map(cleanStanza)
        .filter((stanza) => stanza.text.length > 0)
        .map((stanza, order) => ({ ...stanza, order }));

      return {
        number: index + 1,
        title: hymn.title.trim(),
        firstLine: firstLine(hymn.stanzas),
        author: hymn.author?.trim() || null,
        languageCode: "en",
        sourceUrl: `https://hymnary.org/text/${encodeURIComponent(hymn.entry_id)}`,
        stanzas,
        originalHymnal: hymn.hymnal_title,
        originalYear: hymn.hymnal_year,
      };
    })
    .filter((hymn) => hymn.stanzas.length > 0 && hymn.firstLine);

  console.log(`Importing ${prepared.length} hymns with ${prepared.reduce((sum, h) => sum + h.stanzas.length, 0)} stanzas…`);

  await db.source.upsert({
    where: { id: SOURCE_ID },
    create: {
      id: SOURCE_ID,
      organization: "Hymnary.org (Calvin University)",
      title: "Public Domain Hymns — Hymnary.org oldest-PD-instances export",
      sourceUrl: "https://hymnary.org",
      license: "Public domain",
      licenseUrl: "https://hymnary.org/page/types/license",
      permissionNotes:
        "Published as a public-domain hymn collection. Attribution and a link to Hymnary.org are retained on every hymn.",
      verificationStatus: "VERIFIED",
      lastVerifiedAt: new Date(),
    },
    update: {
      verificationStatus: "VERIFIED",
      lastVerifiedAt: new Date(),
    },
  });

  await db.source.upsert({
    where: { id: "sda-hymnal-rights" },
    create: {
      id: "sda-hymnal-rights",
      organization: "Review and Herald / Adventist publishing houses",
      title: "Official English Seventh-day Adventist Hymnal",
      license: "Copyright — written permission required",
      permissionNotes:
        "The official English SDA Hymnal is a copyrighted publication. No authorised digital text has been supplied, so its lyrics are not reproduced or generated.",
      verificationStatus: "UNAVAILABLE",
      lastVerifiedAt: new Date(),
    },
    update: { lastVerifiedAt: new Date() },
  });

  await db.source.upsert({
    where: { id: "sda-hymnal-rw-rights" },
    create: {
      id: "sda-hymnal-rw-rights",
      organization: "Rwanda Union Mission",
      title: "Official Kinyarwanda Seventh-day Adventist hymnal",
      license: "Copyright — written permission required",
      permissionNotes:
        "No authorised Kinyarwanda hymnal text has been supplied on this installation. An imported supplied text, when present, uses its own source record.",
      verificationStatus: "UNAVAILABLE",
      lastVerifiedAt: new Date(),
    },
    update: { lastVerifiedAt: new Date() },
  });

  const written = await db.$transaction(async (tx) => {
  await tx.hymnCollection.upsert({
    where: { id: COLLECTION_ID },
    create: {
      id: COLLECTION_ID,
      name: "Public-domain hymn library",
      languageCode: "en",
      publisher: "Hymnary.org (Calvin University)",
      copyright:
        "Public domain. Sourced from Hymnary.org's oldest known public-domain instances.",
      license: "Public domain",
      sourceUrl: "https://hymnary.org",
      sourceId: SOURCE_ID,
      verificationStatus: "VERIFIED",
      availabilityNote:
        "A cross-denominational library of public-domain hymn texts. It is not the official Seventh-day Adventist Hymnal.",
      numberingNote:
        "Catalogue numbers are assigned by this platform for reference. They are not official hymnal numbers.",
      isOfficialSda: false,
      hymnCount: prepared.length,
      sortOrder: 1,
    },
    update: {
      hymnCount: prepared.length,
      verificationStatus: "VERIFIED",
      availabilityNote:
        "A cross-denominational library of public-domain hymn texts. It is not the official Seventh-day Adventist Hymnal.",
    },
  });

  await tx.hymnCollection.upsert({
    where: { id: "sda-hymnal-en" },
    create: {
      id: "sda-hymnal-en",
      name: "The Seventh-day Adventist Hymnal (English)",
      languageCode: "en",
      publisher: "Review and Herald / Adventist publishing houses",
      copyright:
        "Copyright held by the Seventh-day Adventist publishing houses. Used only with written permission.",
      license: "Copyright — permission required",
      sourceId: "sda-hymnal-rights",
      verificationStatus: "UNAVAILABLE",
      availabilityNote:
        "The official English SDA Hymnal is still in copyright. An authorised digital text has not been supplied, so its lyrics and numbering are not reproduced here. The public-domain hymn library below is offered as an honest alternative.",
      numberingNote: "Official hymnal numbering is preserved only with authorised data.",
      isOfficialSda: true,
      hymnCount: 0,
      sortOrder: 2,
    },
    update: { verificationStatus: "UNAVAILABLE" },
  });

  const existingRw = await tx.hymnCollection.findUnique({
    where: { id: "sda-hymnal-rw" },
  });
  const kinyarwandaImported = (existingRw?.hymnCount ?? 0) > 0;

  await tx.hymnCollection.upsert({
    where: { id: "sda-hymnal-rw" },
    create: {
      id: "sda-hymnal-rw",
      name: "Indirimbo zo Guhimbaza Imana",
      languageCode: "rw",
      publisher: "Rwanda Union Mission / authorised SDA publisher",
      copyright:
        "Copyright held by the authorised Kinyarwanda hymnal publisher. Used only with written permission.",
      license: "Copyright — permission required",
      sourceId: "sda-hymnal-rw-rights",
      verificationStatus: "UNAVAILABLE",
      availabilityNote:
        "The supplied Kinyarwanda SDA hymnal PDF set has not been imported on this installation. Place the PDFs at the project root and run npm run ingest:kinyarwanda-hymns. English hymns are never machine-translated and presented as Kinyarwanda hymns.",
      numberingNote:
        "Hymn numbers follow the printed Kinyarwanda hymnal, 1–500, once imported.",
      isOfficialSda: true,
      hymnCount: 0,
      sortOrder: 3,
    },
    update: kinyarwandaImported
      ? { hymnCount: existingRw?.hymnCount ?? 0 }
      : { verificationStatus: "UNAVAILABLE" },
  });

  console.log("Replacing the previous import atomically…");
  await tx.hymn.deleteMany({ where: { collectionId: COLLECTION_ID } });

  for (let start = 0; start < prepared.length; start += BATCH_SIZE) {
    const batch = prepared.slice(start, start + BATCH_SIZE);
    await tx.hymn.createMany({
      data: batch.map((hymn) => ({
        collectionId: COLLECTION_ID,
        number: hymn.number,
        title: hymn.title,
        languageCode: hymn.languageCode,
        firstLine: hymn.firstLine,
        author: hymn.author,
        verificationStatus: "VERIFIED",
        sourceUrl: hymn.sourceUrl,
      })),
    });

    const inserted = await tx.hymn.findMany({
      where: {
        collectionId: COLLECTION_ID,
        number: { in: batch.map((hymn) => hymn.number) },
      },
      select: { id: true, number: true },
    });
    const idByNumber = new Map(inserted.map((row) => [row.number, row.id]));

    const stanzas = batch.flatMap((hymn) => {
      const hymnId = idByNumber.get(hymn.number);
      if (!hymnId) throw new Error(`Hymn ${hymn.number} was not inserted.`);
      return hymn.stanzas.map((stanza) => ({
        hymnId,
        order: stanza.order,
        kind: stanza.kind,
        text: stanza.text,
      }));
    });

    await tx.hymnStanza.createMany({ data: stanzas });

    if (start % (BATCH_SIZE * 10) === 0) {
      console.log(`  ${Math.min(start + BATCH_SIZE, prepared.length)}/${prepared.length}`);
    }
  }

  const [writtenHymns, writtenStanzas] = await Promise.all([
    tx.hymn.count({ where: { collectionId: COLLECTION_ID } }),
    tx.hymnStanza.count({ where: { hymn: { collectionId: COLLECTION_ID } } }),
  ]);
  const expectedStanzas = prepared.reduce((sum, hymn) => sum + hymn.stanzas.length, 0);
  if (writtenHymns !== prepared.length || writtenStanzas !== expectedStanzas) {
    throw new Error(
      `Wrote ${writtenHymns} hymns and ${writtenStanzas} stanzas; expected ${prepared.length} and ${expectedStanzas}.`,
    );
  }
  return writtenHymns;
  }, { maxWait: 30000, timeout: 600000 });

  await db.syncLog.create({
    data: {
      kind: "hymn",
      status: "SUCCESS",
      message: `Imported ${written} public-domain English hymns from Hymnary.org.`,
      detail: JSON.stringify({
        collection: COLLECTION_ID,
        hymns: written,
        stanzas: prepared.reduce((sum, hymn) => sum + hymn.stanzas.length, 0),
        license: corpus.meta.license,
        source: corpus.meta.provenance?.source_edition ?? null,
      }),
    },
  });

  console.log(`Hymn ingestion complete: ${written} hymns.`);
}

main()
  .catch(async (error) => {
    console.error(error);
    await db.syncLog
      .create({
        data: {
          kind: "hymn",
          status: "FAILED",
          message: "Hymn import failed.",
          detail: (error as Error).message,
        },
      })
      .catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
