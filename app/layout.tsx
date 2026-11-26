import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SdaSymbol } from "@/components/sda-symbol";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library";
import { PreferencesProvider, themeBootstrapScript } from "@/lib/preferences";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RCA SDA — Bible, Hymnal & Sabbath School",
    template: "%s · RCA SDA",
  },
  description:
    "Read Scripture, sing from the hymnal and study the Sabbath School lesson with the RCA Seventh-day Adventist community.",
  applicationName: "RCA SDA",
  openGraph: {
    title: "RCA SDA — Bible, Hymnal & Sabbath School",
    description:
      "A quiet digital home for Scripture, hymnody and Sabbath School study.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141110" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      data-theme="light"
      data-reader-font="serif"
      suppressHydrationWarning
    >
      <head>
        <script
          // Applies the stored theme before first paint to avoid a flash.
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <PreferencesProvider>
          <LibraryProvider user={user}>
            <SiteHeader user={user} />
            <main id="main" className="pb-24 md:pb-0">
              {children}
            </main>
            <SiteFooter />
            <MobileTabBar />
          </LibraryProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-rule bg-parchment">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <SdaSymbol className="size-10 shrink-0 text-brand" />
            <p className="font-serif text-lg text-ink">RCA SDA</p>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Bible, hymns and Sabbath School study for the RCA community.
          </p>
        </div>
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
            Read
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>
              <Link href="/bible" className="link-underline">
                Bible
              </Link>
            </li>
            <li>
              <Link href="/hymnal" className="link-underline">
                Hymnal
              </Link>
            </li>
            <li>
              <Link href="/sabbath-school" className="link-underline">
                Sabbath School
              </Link>
            </li>
            <li>
              <Link href="/plans" className="link-underline">
                Reading plans
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.08em] text-muted uppercase">
            More
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>
              <Link href="/about" className="link-underline">
                Sources &amp; licensing
              </Link>
            </li>
            <li>
              <Link href="/about#photography" className="link-underline">
                Photography credits
              </Link>
            </li>
            <li>
              <Link href="/library" className="link-underline">
                Your library
              </Link>
            </li>
            <li>
              <Link href="/login" className="link-underline">
                Member sign-in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>RCA SDA · Bible, hymns and Sabbath School.</p>
        </div>
      </div>
    </footer>
  );
}
