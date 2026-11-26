import Link from "next/link";

import type { BookSummary } from "@/lib/bible";

export function BookGrid({
  books,
  hrefFor,
}: {
  books: BookSummary[];
  hrefFor: (book: BookSummary) => string;
}) {
  const oldTestament = books.filter((book) => book.testament === "OT");
  const newTestament = books.filter((book) => book.testament === "NT");

  return (
    <div className="space-y-10">
      <Testament title="Old Testament" books={oldTestament} hrefFor={hrefFor} />
      <Testament title="New Testament" books={newTestament} hrefFor={hrefFor} />
    </div>
  );
}

function Testament({
  title,
  books,
  hrefFor,
}: {
  title: string;
  books: BookSummary[];
  hrefFor: (book: BookSummary) => string;
}) {
  if (books.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        <span className="text-xs tabular-nums text-muted">{books.length} books</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <Link
            key={book.id}
            href={hrefFor(book)}
            className="group flex items-baseline justify-between gap-2 rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-burgundy hover:text-burgundy"
          >
            <span className="min-w-0 truncate">{book.name}</span>
            <span className="shrink-0 text-[0.7rem] tabular-nums text-muted group-hover:text-burgundy/70">
              {book.chapterCount}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
