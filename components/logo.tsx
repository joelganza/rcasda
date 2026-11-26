import Link from "next/link";

import { SdaSymbol } from "./sda-symbol";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5"
      aria-label="RCA SDA — home"
    >
      <SdaSymbol className="size-10 shrink-0 text-brand transition-[transform,color] duration-500 ease-out group-hover:scale-[1.045] group-hover:text-brand-soft" />
      <span className="leading-none">
        <span className="block text-[0.95rem] font-semibold tracking-[-0.01em] text-ink transition-colors duration-300 group-hover:text-burgundy">
          RCA SDA
        </span>
        {compact ? null : (
          <span className="mt-1 block text-[0.66rem] font-medium tracking-[0.04em] text-muted">
            Seventh-day Adventist
          </span>
        )}
      </span>
    </Link>
  );
}
