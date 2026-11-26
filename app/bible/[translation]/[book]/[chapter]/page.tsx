import { notFound, redirect } from "next/navigation";

import { BibleReader } from "@/components/bible/bible-reader";
import { getBooks, getChapter, getChapterNeighbours } from "@/lib/bible";
import { getTranslation, listTranslations } from "@/lib/content";
import { safeDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ translation: string; book: string; chapter: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { translation, book, chapter } = await params;
  const edition = await getTranslation(translation);
  const data = await getChapter(
    translation,
    book,
    Number(chapter),
    edition?.languageCode,
  );
  if (!edition || !data) return { title: "Bible" };
  return {
    title: `${data.bookName} ${data.chapter} · ${edition.abbreviation}`,
    description: `Read ${data.bookName} ${data.chapter} in the ${edition.name}.`,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { translation: translationId, book: bookId, chapter: rawChapter } = await params;
  const chapter = Number(rawChapter);
  if (!Number.isInteger(chapter) || chapter < 1) notFound();

  const unavailable = { unavailable: true } as const;
  const translationResult = await safeDb(() => getTranslation(translationId), unavailable);
  if (translationResult === unavailable) return <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-soft">Bible data is temporarily unavailable. Please try again shortly.</p>;
  const translation = translationResult as NonNullable<Awaited<ReturnType<typeof getTranslation>>>;
  if (!translation) notFound();

  const [translationsResult, booksResult, dataResult] = await Promise.all([
    safeDb(listTranslations, unavailable),
    safeDb(() => getBooks(translation.languageCode, translation.id), unavailable),
    safeDb(() => getChapter(translationId, bookId, chapter, translation.languageCode), unavailable),
  ]);
  if (translationsResult === unavailable || booksResult === unavailable || dataResult === unavailable) return <p className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-soft">Bible data is temporarily unavailable. Please try again shortly.</p>;
  const translations = translationsResult as Awaited<ReturnType<typeof listTranslations>>;
  const books = booksResult as Awaited<ReturnType<typeof getBooks>>;
  const data = dataResult as Awaited<ReturnType<typeof getChapter>>;

  if (!data) notFound();
  if (translation.verificationStatus === "UNAVAILABLE" || translation.verseCount === 0) {
    redirect(`/bible/${translation.id}`);
  }
  if (data.verses.length === 0) notFound();

  const otherEdition = translations.find(
    (candidate) =>
      candidate.verificationStatus === "VERIFIED" &&
      candidate.isComplete &&
      candidate.id !== translation.id,
  );
  const parallel = otherEdition
    ? await getChapter(otherEdition.id, bookId, chapter, otherEdition.languageCode)
    : null;
  const neighbours = await getChapterNeighbours(
    bookId,
    chapter,
    translation.languageCode,
    translation.id,
  );

  return (
    <BibleReader
      translation={{
        id: translation.id,
        name: translation.name,
        abbreviation: translation.abbreviation,
        language: translation.language,
        copyright: translation.copyright,
        license: translation.license,
      }}
      book={{ id: data.bookId, name: data.bookName, chapterCount: data.chapterCount }}
      chapter={chapter}
      verses={data.verses}
      parallelTranslation={
        otherEdition && parallel && parallel.verses.length > 0
          ? {
              id: otherEdition.id,
              name: otherEdition.name,
              abbreviation: otherEdition.abbreviation,
              language: otherEdition.language,
              copyright: otherEdition.copyright,
              license: otherEdition.license,
            }
          : null
      }
      parallelVerses={
        otherEdition && parallel && parallel.verses.length > 0
          ? parallel.verses
          : null
      }
      books={books}
      neighbours={neighbours}
    />
  );
}
