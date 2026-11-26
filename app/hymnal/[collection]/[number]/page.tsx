import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HymnToolbar } from "@/components/hymnal/hymn-tools";
import { PageHeader } from "@/components/page-header";
import { getHymn, getHymnNeighbours } from "@/lib/hymns";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ collection: string; number: string }> };

export async function generateMetadata({ params }: Props) {
  const { collection, number } = await params;
  const hymn = await getHymn(collection, Number(number));
  return {
    title: hymn ? `${hymn.title} (No. ${hymn.number})` : "Hymn",
    description: hymn?.firstLine,
  };
}

export default async function HymnPage({ params }: Props) {
  const { collection: collectionId, number: rawNumber } = await params;
  const number = Number(rawNumber);
  if (!Number.isInteger(number)) notFound();

  const hymn = await getHymn(collectionId, number);
  if (
    !hymn ||
    hymn.collection.verificationStatus === "UNAVAILABLE" ||
    hymn.verificationStatus === "UNAVAILABLE"
  ) notFound();

  const neighbours = await getHymnNeighbours(collectionId, number);
  const href = `/hymnal/${collectionId}/${number}`;
  const fullText = hymn.stanzas.map((stanza) => stanza.text).join("\n\n");
  let verseCounter = 0;

  return (
    <div>
      <PageHeader
        eyebrow={`${hymn.collection.name} · No. ${hymn.number}`}
        title={hymn.title}
        description={hymn.firstLine}
        actions={
          <HymnToolbar
            collectionId={collectionId}
            number={hymn.number}
            title={hymn.title}
            subtitle={`No. ${hymn.number} · ${hymn.collection.name}`}
            href={href}
            collectionName={hymn.collection.name}
            text={fullText}
          />
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {hymn.collection.verificationStatus !== "VERIFIED" ||
        hymn.verificationStatus !== "VERIFIED" ? (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <p className="font-medium">Verification pending</p>
            <p className="mt-1">{hymn.collection.availabilityNote}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
          <Link
            href={`/hymnal/${collectionId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {hymn.collection.name}
          </Link>
          <p className="text-xs text-muted">
            {hymn.languageCode === "rw" ? "Ikinyarwanda" : "English"}
            {hymn.author ? ` · ${hymn.author}` : ""}
          </p>
        </div>

        <article className="hymn-text page-in mt-8">
          {hymn.stanzas.map((stanza) => {
            const label = stanza.kind === "chorus" ? "Refrain" : `Verse ${++verseCounter}`;
            return (
              <section key={stanza.id} className="stanza">
                <span className="stanza-label">{label}</span>
                <p className="whitespace-pre-line">{stanza.text}</p>
              </section>
            );
          })}
        </article>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-rule pt-5">
          {neighbours.previous ? (
            <Link
              href={`/hymnal/${collectionId}/${neighbours.previous.number}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                {neighbours.previous.number}. {neighbours.previous.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {neighbours.next ? (
            <Link
              href={`/hymnal/${collectionId}/${neighbours.next.number}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:border-rule-strong hover:text-ink"
            >
              <span className="min-w-0 truncate">
                {neighbours.next.number}. {neighbours.next.title}
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
