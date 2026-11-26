import { ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import Image from "next/image";

import type { Photo } from "@/lib/photos";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  photo,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  photo?: Photo;
}) {
  return (
    <div className="border-b border-rule bg-parchment">
      <div
        className={`mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:py-14 ${
          photo
            ? "md:grid md:grid-cols-[minmax(0,1fr)_16rem] md:items-end md:gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
            : "md:flex-row md:items-end md:justify-between md:gap-5"
        }`}
      >
        <div className="max-w-2xl">
          {eyebrow ? (
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-gold" aria-hidden />
              <p className="text-[0.7rem] font-medium tracking-[0.1em] text-burgundy uppercase">
                {eyebrow}
              </p>
            </div>
          ) : null}
          <h1 className="mt-2 font-serif text-[2.1rem] leading-[1.1] tracking-[-0.015em] text-ink md:text-[2.9rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>

        {photo ? (
          <figure className="w-full md:justify-self-end">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface ring-1 ring-rule-strong/70 md:aspect-[4/3]">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 20rem, (min-width: 768px) 16rem, 100vw"
                className="media-settle object-cover"
                style={photo.position ? { objectPosition: photo.position } : undefined}
              />
            </div>
          </figure>
        ) : null}
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="h-px w-5 bg-gold" aria-hidden />
          <h2 className="font-serif text-[1.45rem] leading-tight text-ink">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const STATUS = {
  VERIFIED: {
    label: "Verified",
    icon: ShieldCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  PENDING: {
    label: "Pending verification",
    icon: ShieldQuestion,
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    icon: ShieldX,
    className: "border-rule bg-surface text-muted",
  },
} as const;

export function VerificationBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = STATUS[status as keyof typeof STATUS] ?? STATUS.PENDING;
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${tone.className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label ?? tone.label}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card border-dashed border-rule-strong bg-parchment px-5 py-10 text-center">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
