import { ArrowRight, CalendarRange } from "lucide-react";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/page-header";
import { listPlans } from "@/lib/plans";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reading plans",
  description:
    "Read the whole Bible, the New Testament or the Psalms with a simple daily schedule. Scripture always opens in a verified edition.",
};

export default async function PlansPage() {
  const plans = await listPlans();

  return (
    <div>
      <PageHeader
        eyebrow="Study"
        title="Reading plans"
        description="A simple daily rhythm for Scripture, with every reading linked to the Bible."
        photo={PHOTOS.plans}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {plans.length === 0 ? (
          <EmptyState title="No reading plans yet">
            <p>Plans will appear here once they are available.</p>
          </EmptyState>
        ) : (
          <div className="stagger grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/plans/${plan.slug}`}
                className="group flex flex-col justify-between card border-rule bg-paper p-5 hover:border-burgundy"
              >
                <div>
                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.1em] text-burgundy uppercase">
                    <CalendarRange className="size-3.5" aria-hidden />
                    Reading plan
                  </span>
                  <h2 className="mt-3 font-serif text-xl leading-snug text-ink transition-colors duration-300 group-hover:text-burgundy">
                    {plan.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{plan.days} days</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {plan.description}
                  </p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy">
                  Start this plan
                  <ArrowRight
                    className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
