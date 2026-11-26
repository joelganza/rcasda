/**
 * Kinyarwanda SDA hymnal ingestion.
 *
 * Imports the 500 hymns in the supplied "Indirimbo zo Guhimbaza Imana" PDF
 * set. The parser reconstructs the text from the PDFs' embedded text layer;
 * this importer refuses to run unless every hymn number 1–500 is present.
 *
 * The text is reproduced as supplied. No hymn is generated, translated,
 * completed from memory, or substituted from another hymnal. The project
 * owner supplied the PDFs; redistribution rights have not been independently
 * verified and are stated plainly in the collection record and UI.
 *
 * Usage: npm run ingest:kinyarwanda-hymns
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../lib/db";

type ParsedHymn = {
  number: number;
  title: string;
  firstLine: string;
  stanzas: { kind: string; text: string }[];
  pages: number[];
};

type ParsedHymnal = {
  title: string;
  languageCode: string;
  pageCount: number;
  hymns: ParsedHymn[];
};

const INPUT = path.join(
  process.cwd(),
  "content",
  "cache",
  "kinyarwanda-hymnal.json",
);
const COLLECTION_ID = "sda-hymnal-rw";
const SOURCE_ID = "sda-hymnal-rw-supplied";
const BATCH_SIZE = 50;

function validate(hymnal: ParsedHymnal) {
  if (hymnal.hymns.length !== 500) {
    throw new Error(
      `Expected 500 hymns, found ${hymnal.hymns.length}. Run the parser again.`,
    );
  }

  const numbers = new Set<number>();
  for (const hymn of hymnal.hymns) {
    if (!Number.isInteger(hymn.number) || hymn.number < 1 || hymn.number > 500) {
      throw new Error(`Invalid hymn number: ${hymn.number}.`);
    }
    if (numbers.has(hymn.number)) {
      throw new Error(`Duplicate hymn number: ${hymn.number}.`);
    }
    numbers.add(hymn.number);

    if (!hymn.title.trim()) {
      throw new Error(`Hymn ${hymn.number} has no title.`);
    }
    if (!hymn.firstLine.trim()) {
      throw new Error(`Hymn ${hymn.number} has no first line.`);
    }
    if (hymn.stanzas.length === 0) {
      throw new Error(`Hymn ${hymn.number} has no stanzas.`);
    }
    for (const stanza of hymn.stanzas) {
      if (!stanza.text.trim()) {
        throw new Error(`Hymn ${hymn.number} contains an empty stanza.`);
      }
    }
  }

  for (let number = 1; number <= 500; number += 1) {
    if (!numbers.has(number)) {
      throw new Error(`Hymn ${number} is missing from the parsed hymnal.`);
    }
  }
}

async function main() {
  const hymnal = JSON.parse(await readFile(INPUT, "utf8")) as ParsedHymnal;
  validate(hymnal);

  const stanzaCount = hymnal.hymns.reduce(
    (sum, hymn) => sum + hymn.stanzas.length,
    0,
  );

  console.log(
    `Importing ${hymnal.hymns.length} Kinyarwanda hymns with ${stanzaCount} stanzas…`,
  );

  await db.source.upsert({
    where: { id: SOURCE_ID },
    create: {
      id: SOURCE_ID,
      organization:
        "Rwanda Union Mission / Eglise Adventiste du 7ème Jour au Rwanda",
      title: "Indirimbo zo Guhimbaza Imana — 500 Kinyarwanda SDA hymns",
      license:
        "Copyright — supplied by the project owner; redistribution rights not independently verified",
      permissionNotes:
        "The complete 500-hymn PDF was supplied for this project. Lyrics were extracted from the PDF text layer; no hymns were generated, translated, completed or substituted. Redistribution permission has not been independently verified.",
      verificationStatus: "PENDING",
      lastVerifiedAt: null,
    },
    update: {
      organization:
        "Rwanda Union Mission / Eglise Adventiste du 7ème Jour au Rwanda",
      title: "Indirimbo zo Guhimbaza Imana — 500 Kinyarwanda SDA hymns",
      license:
        "Copyright — supplied by the project owner; redistribution rights not independently verified",
      permissionNotes:
        "The complete 500-hymn PDF was supplied for this project. Lyrics were extracted from the PDF text layer; no hymns were generated, translated, completed or substituted. Redistribution permission has not been independently verified.",
      verificationStatus: "PENDING",
      lastVerifiedAt: null,
    },
  });

  const { writtenHymns, writtenStanzas } = await db.$transaction(async (tx) => {
  await tx.hymnCollection.upsert({
    where: { id: COLLECTION_ID },
    create: {
      id: COLLECTION_ID,
      name: "Indirimbo zo Guhimbaza Imana",
      languageCode: "rw",
      publisher: "Rwanda Union Mission",
      copyright:
        "© Rwanda Union Mission / Eglise Adventiste du 7ème Jour au Rwanda. Supplied by the project owner; rights not independently verified.",
      license:
        "Copyright — supplied by the project owner; redistribution rights not independently verified",
      sourceId: SOURCE_ID,
      verificationStatus: "PENDING",
      availabilityNote:
        "The complete 500-hymn Kinyarwanda SDA hymnal was supplied for this project. Text is reproduced as printed; no hymns were generated, translated or reconstructed. Rights have not been independently verified.",
      numberingNote:
        "Hymn numbers follow the printed Kinyarwanda hymnal, 1–500.",
      isOfficialSda: true,
      hymnCount: hymnal.hymns.length,
      sortOrder: 3,
    },
    update: {
      name: "Indirimbo zo Guhimbaza Imana",
      languageCode: "rw",
      publisher: "Rwanda Union Mission",
      copyright:
        "© Rwanda Union Mission / Eglise Adventiste du 7ème Jour au Rwanda. Supplied by the project owner; rights not independently verified.",
      license:
        "Copyright — supplied by the project owner; redistribution rights not independently verified",
      sourceId: SOURCE_ID,
      verificationStatus: "PENDING",
      availabilityNote:
        "The complete 500-hymn Kinyarwanda SDA hymnal was supplied for this project. Text is reproduced as printed; no hymns were generated, translated or reconstructed. Rights have not been independently verified.",
      numberingNote:
        "Hymn numbers follow the printed Kinyarwanda hymnal, 1–500.",
      isOfficialSda: true,
      hymnCount: hymnal.hymns.length,
      sortOrder: 3,
    },
  });

  const existing = await tx.hymn.findMany({
    where: { collectionId: COLLECTION_ID },
    select: { id: true },
  });
  if (existing.length > 0) {
    await tx.hymnStanza.deleteMany({
      where: { hymnId: { in: existing.map((hymn) => hymn.id) } },
    });
    await tx.hymn.deleteMany({ where: { collectionId: COLLECTION_ID } });
  }

  for (let start = 0; start < hymnal.hymns.length; start += BATCH_SIZE) {
    const batch = hymnal.hymns.slice(start, start + BATCH_SIZE);

    await tx.hymn.createMany({
      data: batch.map((hymn) => ({
        collectionId: COLLECTION_ID,
        number: hymn.number,
        title: hymn.title,
        languageCode: "rw",
        firstLine: hymn.firstLine,
        verificationStatus: "PENDING",
      })),
    });

    const inserted = await tx.hymn.findMany({
      where: {
        collectionId: COLLECTION_ID,
        number: { in: batch.map((hymn) => hymn.number) },
      },
      select: { id: true, number: true },
    });
    const idByNumber = new Map(
      inserted.map((hymn) => [hymn.number, hymn.id]),
    );

    const stanzas = batch.flatMap((hymn) => {
      const hymnId = idByNumber.get(hymn.number);
      if (!hymnId) {
        throw new Error(`Hymn ${hymn.number} was not inserted.`);
      }
      return hymn.stanzas.map((stanza, order) => ({
        hymnId,
        order,
        kind: stanza.kind,
        text: stanza.text,
      }));
    });

    await tx.hymnStanza.createMany({ data: stanzas });
    console.log(`  ${Math.min(start + BATCH_SIZE, hymnal.hymns.length)}/500`);
  }

  const [writtenHymns, writtenStanzas] = await Promise.all([
    tx.hymn.count({ where: { collectionId: COLLECTION_ID } }),
    tx.hymnStanza.count({
      where: { hymn: { collectionId: COLLECTION_ID } },
    }),
  ]);

  if (writtenHymns !== hymnal.hymns.length || writtenStanzas !== stanzaCount) {
    throw new Error(
      `Wrote ${writtenHymns} hymns and ${writtenStanzas} stanzas; expected ${hymnal.hymns.length} and ${stanzaCount}.`,
    );
  }
  await tx.hymnCollection.update({
    where: { id: COLLECTION_ID },
    data: {
      hymnCount: writtenHymns,
      verificationStatus: "PENDING",
      availabilityNote:
        "500 hymns and their stanzas were imported from the supplied PDF set. Text was not independently verified against an authorized master; redistribution rights also remain unverified.",
    },
  });
  return { writtenHymns, writtenStanzas };
  }, { maxWait: 15000, timeout: 120000 });

  await db.syncLog.create({
    data: {
      kind: "hymn",
      status: "SUCCESS",
      message: `Imported ${writtenHymns} Kinyarwanda SDA hymns from the supplied PDF set.`,
      detail: JSON.stringify({
        collection: COLLECTION_ID,
        hymns: writtenHymns,
        stanzas: writtenStanzas,
        pages: hymnal.pageCount,
        sourcePdf: "Indirimbo_Zo_Guhimbaza_Imana_za_500_SDA_compressed-*.pdf",
        rights: "Supplied by project owner; not independently verified",
      }),
    },
  });

  console.log(
    `Kinyarwanda hymnal import complete: ${writtenHymns} hymns, ${writtenStanzas} stanzas.`,
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    await db.syncLog
      .create({
        data: {
          kind: "hymn",
          status: "FAILED",
          message: "Kinyarwanda hymnal import failed.",
          detail: (error as Error).message,
        },
      })
      .catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
