"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DisplayMenu, ThemeToggle } from "./display-menu";
import { Logo } from "./logo";
import { SearchDialog } from "./search-dialog";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/bible", label: "Bible" },
  { href: "/hymnal", label: "Hymnal" },
  { href: "/sabbath-school", label: "Sabbath School" },
  { href: "/plans", label: "Plans" },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-3 py-2 text-[0.875rem] transition-colors ${
                  active
                    ? "text-ink"
                    : "text-ink-soft hover:bg-surface hover:text-ink"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="nav-line absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-gold" />
                ) : null}
              </Link>
            );
          })}
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className={`rounded-md px-3 py-2 text-[0.875rem] transition-colors ${
                pathname.startsWith("/admin")
                  ? "text-ink"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <div className="hidden sm:block">
            <DisplayMenu />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Link
            href={user ? "/library" : "/login"}
            className="inline-flex size-9 items-center justify-center rounded-full border border-rule text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
            aria-label={user ? "Your library" : "Sign in"}
            title={user ? "Your library" : "Sign in"}
          >
            {user ? (
              <span className="text-xs font-semibold text-burgundy">
                {(user.name ?? user.email).slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <UserRound className="size-4" aria-hidden />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
