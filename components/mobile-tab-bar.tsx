"use client";

import { BookOpen, House, Music4, NotebookPen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/bible", label: "Bible", icon: BookOpen },
  { href: "/hymnal", label: "Hymnal", icon: Music4 },
  { href: "/sabbath-school", label: "Sabbath School", icon: NotebookPen },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 px-1 py-2.5 text-[0.66rem] leading-tight transition-colors ${
                  active ? "text-burgundy" : "text-muted hover:text-ink"
                }`}
              >
                {active ? (
                  <span className="nav-line absolute inset-x-6 top-0 h-[2px] rounded-full bg-gold" />
                ) : null}
                <Icon className="size-[1.15rem]" aria-hidden strokeWidth={active ? 2 : 1.7} />
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
