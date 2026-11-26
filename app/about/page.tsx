import { BookOpen, ExternalLink, HeartHandshake, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PageHeader, VerificationBadge } from "@/components/page-header";
import { listHymnCollections, listTranslations } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About & sources",
  description:
    "How RCA SDA handles Scripture, hymns and Sabbath School lessons: verified sources, honest availability labels, and no generated religious text.",
};

export default async function AboutPage() {
  const unavailable = { unavailable: true } as const;
  const [translationsResult, collectionsResult] = await Promise.all([
    safeDb(listTranslations, unavailable),
    safeDb(listHymnCollections, unavailable),
  ]);
  const failed = translationsResult === unavailable || collectionsResult === unavailable;
  const translations = translationsResult === unavailable ? [] : translationsResult as Awaited<ReturnType<typeof listTranslations>>;
  const collections = collectionsResult === unavailable ? [] : collectionsResult as Awaited<ReturnType<typeof listHymnCollections>>;

  return (
    <div>
      <PageHeader
        eyebrow="About"
        title="Sources, rights and editorial standards"
        description="A reading library built to show exactly where every text comes from — and to say plainly when a text is not available."
        photo={PHOTOS.church}
      />

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6">
        {failed ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Some data is temporarily unavailable. Please try again shortly.</p> : null}
        <section className="space-y-3 text-[0.95rem] leading-relaxed text-ink-soft">
          <p>
            RCA SDA is a reading platform for Seventh-day Adventist members and anyone
            studying with them. It brings together public-domain English Scripture, the
            supplied Kinyarwanda Bibiliya Yera, a public-domain hymn library and the current Sabbath School lesson metadata in
            one calm, accessible place.
          </p>
          <p>
            The guiding rule is simple: <strong className="text-ink">accuracy before
            completeness</strong>. When an authorised text has not been supplied, the
            library says so and links to the rights holder instead of filling the gap.
          </p>
          <p className="border-l-2 border-gold pl-3 text-xs leading-relaxed text-muted">
            The Seventh-day Adventist Church symbol is reproduced from the official
            Adventist Identity Guideline System. It remains a registered trademark of
            the General Conference of Seventh-day Adventists; RCA SDA is an independent
            community project, not an official church website.
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
            <ShieldCheck className="size-5 text-burgundy" aria-hidden />
            What we never do
          </h2>
          <ul className="mt-4 space-y-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
            {[
              "We never generate Bible verses. Every verse is stored text from an identified edition.",
              "We never generate Kinyarwanda SDA hymns, and we never translate English hymns and present them as official Kinyarwanda hymns.",
              "We never store, rewrite or summarise Sabbath School lesson text. Daily readings are fetched live from the official Adventech feed, attributed, and linked back to the source.",
              "We never label a public-domain hymn as an official SDA Hymnal item. Catalogue numbers in the public-domain library are assigned by this platform and disclosed as such.",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
            <BookOpen className="size-5 text-burgundy" aria-hidden />
            Bible editions
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Each edition carries a verification label. “Unavailable” is a deliberate,
            honest state — not an error.
          </p>
          <ul className="mt-4 space-y-3">
            {translations.map((translation) => (
              <li key={translation.id} className="card border-rule bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {translation.name}{" "}
                      <span className="text-xs font-normal text-muted">
                        {translation.abbreviation}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {translation.language} · {translation.license}
                    </p>
                  </div>
                  <VerificationBadge status={translation.verificationStatus} />
                </div>
                {translation.availabilityNote ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {translation.availabilityNote}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {translation.copyright}
                  {translation.isComplete
                    ? ` · ${translation.verseCount.toLocaleString("en-GB")} verses, ${translation.bookCount} books`
                    : null}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-ink">Hymn collections</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The searchable library combines a public-domain hymn corpus with the
            supplied 500-hymn Kinyarwanda SDA hymnal. The official English SDA Hymnal
            remains unavailable until an authorised text is supplied.
          </p>
          <ul className="mt-4 space-y-3">
            {collections.map((collection) => (
              <li key={collection.id} className="card border-rule bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {collection.name}{" "}
                      {collection.isOfficialSda ? (
                        <span className="text-xs font-normal text-muted">
                          official SDA collection
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">
                      {collection.publisher} · {collection.license}
                    </p>
                  </div>
                  <VerificationBadge status={collection.verificationStatus} />
                </div>
                {collection.availabilityNote ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {collection.availabilityNote}
                  </p>
                ) : null}
                {collection.numberingNote ? (
                  <p className="mt-1 text-xs text-muted">{collection.numberingNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-ink">Sabbath School</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
            Quarter and lesson titles, dates and official links come from the official
            Adventech JSON API used by{" "}
            <a
              href="https://absg.adventist.org"
              target="_blank"
              rel="noreferrer"
              className="text-burgundy hover:underline"
            >
              absg.adventist.org
            </a>
            . The daily reading is fetched live from the same official feed when the page
            is viewed, with visible attribution and a link to the source. It is not stored,
            rewritten or presented as an independent edition. The lesson text remains ©
            the General Conference of Seventh-day Adventists; reuse outside this reader
            should be arranged with the rights holder.
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
            <HeartHandshake className="size-5 text-burgundy" aria-hidden />
            Accounts and privacy
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
            Reading is public and needs no account. An optional account stores a hashed
            password (bcrypt), your email, an optional display name, and the bookmarks,
            favourites, notes, history and progress you choose to save. Private notes are
            visible only to you. Guest activity is kept in this browser&apos;s local
            storage and can be merged into an account when you sign in.
          </p>
          <p className="mt-2 text-sm text-muted">
            You can delete saved items from{" "}
            <Link href="/library" className="text-burgundy hover:underline">
              your library
            </Link>
            . Account deletion requests are handled by the site administrator.
          </p>
        </section>

        <section id="photography">
          <h2 className="font-serif text-2xl text-ink">Photography</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Section photographs are used under the{" "}
            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noreferrer"
              className="text-burgundy hover:underline"
            >
              Unsplash License
            </a>
            . They are illustrative and do not depict RCA SDA events or members.
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {Object.values(PHOTOS).map((photo) => (
              <li
                key={photo.src}
                className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5"
              >
                <span className="text-ink-soft">{photo.credit.name}</span>
                <a
                  href={photo.credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-muted hover:text-burgundy"
                >
                  View photo
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="card border-rule bg-surface/60 p-5">
          <h2 className="font-serif text-xl text-ink">Corrections</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            If a source, licence or label is wrong, it should be corrected rather than
            hidden. Report the reference and the edition to the site administrator. Source
            metadata is visible in the administration area, and the import scripts keep the
            original source URLs alongside the data.
          </p>
          <a
            href="https://hymnary.org"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-burgundy hover:underline"
          >
            Hymnary.org <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </section>
      </div>
    </div>
  );
}
