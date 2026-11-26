import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlanTracker } from "@/components/plans/plan-tracker";
import { PageHeader } from "@/components/page-header";
import { getBooks, parseReference } from "@/lib/bible";
import { defaultTranslationId } from "@/lib/content";
import { getPlan, parsePassages } from "@/lib/plans";
import { PHOTOS } from "@/lib/photos";
import { bibleHref } from "@/lib/routes";
import { safeDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  return { title: plan?.title ?? "Reading plan" };
}

export default async function PlanPage({ params }: Props) {
  const { slug } = await params;
  const unavailable = { unavailable: true } as const;
  const [planResult, booksResult, translationResult] = await Promise.all([
    safeDb(() => getPlan(slug), unavailable),
    safeDb(() => getBooks("en"), unavailable),
    safeDb(defaultTranslationId, unavailable),
  ]);
  if (planResult === unavailable || booksResult === unavailable || translationResult === unavailable) return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-soft">Reading plan data is temporarily unavailable. Please try again shortly.</div>;
  const plan = planResult as Awaited<ReturnType<typeof getPlan>>;
  const books = booksResult as Awaited<ReturnType<typeof getBooks>>;
  const translationId = translationResult as Awaited<ReturnType<typeof defaultTranslationId>>;

  if (!plan) notFound();

  const days = plan.items.map((item) => ({
    day: item.day,
    passages: parsePassages(item.passages).map((label) => {
      const parsed = planReference(label);
      const reference = parsed
        ? parseReference(`${parsed.book} ${parsed.chapter}`, books)
        : parseReference(label, books);
      return {
        label,
        href:
          reference && translationId
            ? bibleHref(translationId, reference.bookId, reference.chapter)
            : "/bible",
      };
    }),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Reading plan"
        title={plan.title}
        description={`${plan.days} days · ${plan.description}`}
        photo={PHOTOS.plans}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All plans
        </Link>

        <div className="mt-5">
          <PlanTracker
            planId={plan.slug}
            slug={plan.slug}
            title={plan.title}
            days={days}
          />
        </div>

        <p className="mt-6 text-xs text-muted">
          Progress saves on this device and to your account when signed in.
        </p>
      </div>
    </div>
  );
}

function planReference(label: string) {
  const match = label.match(/^(.*)\s+(\d+)(?:\s*[–-]\s*(\d+))?$/);
  if (!match) return null;
  return { book: match[1].trim(), chapter: Number(match[2]) };
}
