# RCA SDA

A Bible, hymn and Sabbath School reading platform for the RCA Seventh-day Adventist
community. Built with Next.js 15 (App Router), React 19, Prisma and Supabase
PostgreSQL, with a
burgundy-and-gold design, three reading themes and optional member accounts.

The project has one non-negotiable rule: **never invent religious content**. Every
text shown is either imported from a named, verifiable source or explicitly marked
unavailable. Gaps are visible, not filled.

## What is actually in the library

| Content | Status | Source and rights |
| --- | --- | --- |
| King James Version (1769) | Verified, complete | Public domain. Imported from the [`midvash/bible-data`](https://github.com/midvash/bible-data) mirror. 31,102 verses. |
| World English Bible | Verified, complete | Public domain (Rainbow Missions / ebible.org). Imported from the same mirror. 31,098 verses. |
| Kinyarwanda Bible (*Bibiliya Yera*) | Structurally imported; text and rights review pending | The supplied Grace Geeks PDF, also published at abisezerano.com. The parser reports 66 books, 1,189 chapters and 31,141 verses. Eleven chapters were supplemented from the same Kinyarwanda text at bibiliya.com. PDF parser warnings occurred; the full text has not been independently proofread. |
| Public-domain hymn library | Verified | 30,089 hymns / 139,065 stanzas from Hymnary.org's oldest-known public-domain instances, distributed via the [OpenChristianData](https://github.com/OpenChristianData/open-christian-data) mirror. **Not** the official SDA Hymnal. |
| SDA Hymnal (English) | **Available** 
| Kinyarwanda SDA hymnal (*Indirimbo zo Guhimbaza Imana*) | PDF extraction structurally checked; database import and rights require verification | A fresh parse of the supplied 560 PDFs yields 500 numbered hymns / 2,142 stanzas and exactly matches the saved extraction. Lyrics have not been independently proofread; redistribution rights are unverified. |
| Sabbath School lessons | Verified metadata and live reading | Quarter/lesson titles, dates, daily readings and links come from the official Adventech JSON API used by [absg.adventist.org](https://absg.adventist.org). Daily text is fetched live for display with visible attribution and is **not** stored in the database or rewritten. Lesson text is © the General Conference of Seventh-day Adventists. |

Hymn catalogue numbers in the public-domain library are **assigned by this platform**
for reference. They are not official hymnal numbers, and the interface says so.

## Features

- **Bible reader** — book grid, chapter navigation, verse selection, reference search,
  bookmarks, favourites, private notes, reading themes (light / sepia / dark) and
  three reader fonts.
- **Hymnal** — browse and search 30k public-domain hymns and the supplied 500
  Kinyarwanda SDA hymns; numbered pages with stanzas, favourites and source notes.
- **Sabbath School** — current quarter and a live reader for every lesson, with
  Sabbath–Friday switching, loading and error states, and a direct link to the official
  lesson. Every lesson page opens the full week’s readings; there are no completion
  checkboxes. Reading is fetched live through a cached server proxy and is never copied
  into the database.
- **Reading plans** — whole Bible in a year, New Testament in 90 days and Psalms in
  30 days, generated from canonical chapter counts. Progress is per day and links into
  a verified Bible edition.
- **Personal library** — bookmarks, favourites, notes, history and plan progress.
  Works as a guest in `localStorage`; signing in merges local data with the account and
  syncs on change.
- **Accounts** — bcrypt password hashing, HTTP-only session cookies (30 days), email
  uniqueness and optional display name.
- **Administration** — `/admin` for administrators: content counts, source health,
  member roles, session revocation and a one-click official quarter sync.
- **Accessibility** — skip link, labelled forms, keyboard-navigable search dialog,
  visible focus states, semantic headings, reduced-motion-friendly transitions.

## Getting started

Requirements: Node.js 20+, npm and a network connection for the first content import.

```bash
npm install
Copy-Item .env.example .env  # PowerShell; keep the file private
# Fill in DATABASE_URL and DIRECT_URL from your Supabase project
npm run db:deploy           # apply reviewed PostgreSQL migrations
npm run ingest:all          # controlled manual content operation
npm run db:audit            # report actual database record counts
npm run seed:admin          # optional: create the administrator from .env
npm run dev
```

Open <http://localhost:3000>. The dev script uses the webpack dev server. Turbopack is
not enabled because its generated chunk paths can exceed the Windows path limit when the
project lives in a deeply nested folder.

`ingest:all` runs, in order:

1. `ingest:bible` — downloads KJV and WEB JSON, validates book/chapter/verse counts and
   imports them.
2. `ingest:hymns` — imports `content/cache/hymnary.json` (download it with
   `npx tsx scripts/fetch-hymn-corpus.ts` if it is missing). Expect roughly 48 MB and a
   few minutes.
3. `seed:catalog` — creates the reading plans and transparency source records. It
   leaves an already-imported Kinyarwanda Bible untouched. Safe to re-run.
4. `ingest:kinyarwanda` — runs only when `bibiliya.pdf` is present, extracting and
   importing the supplied Kinyarwanda Bible.
5. `ingest:kinyarwanda-hymns` — runs only when the supplied 560 page PDFs are present,
   validating all 500 hymns and importing their Kinyarwanda text.
6. `sync-quarter` — fetches the current standard adult quarter metadata from the
   official API. Safe to re-run.

Individual commands are available as `npm run ingest:bible`, `ingest:hymns`,
`seed:catalog`, `ingest:kinyarwanda`, `ingest:kinyarwanda-hymns`, `ingest:quarter` and
`seed:admin`.

### Kinyarwanda Bible

`bibiliya.pdf` is the supplied Bibiliya Yera edition. Keep it at the project root and
run:

```bash
npm run ingest:kinyarwanda
```

The command extracts the PDF text layer with `pdfjs-dist`, validates all 66 books and
their verse structure, and imports the `kin` translation. Eleven chapters are missing
or damaged in the PDF itself; `scripts/kinyarwanda-supplement.json` contains those
chapters from the same Kinyarwanda text at bibiliya.com. The PDF also
uses the Kinyarwanda/Hebrew chapter split for Joel (4 chapters) and Malachi (3 chapters),
which the reader follows per translation rather than the KJV's 3/4 split.

### Kinyarwanda hymnal

The supplied hymnal is a set of 560 single-page PDFs named
`Indirimbo_Zo_Guhimbaza_Imana_za_500_SDA_compressed-*.pdf`. Keep them at the project
root and run:

```bash
npm run ingest:kinyarwanda-hymns
```

The parser reconstructs lines from the PDFs' embedded text layer, removes page and
score furniture, and validates that every hymn number 1–500 is present. It reports
500 hymns, 2,142 stanzas, no missing numbers and no unreadable pages. Lyrics are
reproduced as printed; the script never generates, translates or completes a hymn.

### Environment variables

`.env.example` documents the full set:

```dotenv
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=15&pool_timeout=20"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15"
INGEST_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=3&connect_timeout=15&pool_timeout=30"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="a-long-unique-password"
```

`DATABASE_URL` is the Vercel runtime connection through Supabase's **Transaction pooler**
(port 6543). `DIRECT_URL` is the **Session pooler** (port 5432) for Prisma migrations.
`INGEST_DATABASE_URL` is optional and selects the session pooler for a manually run,
long-running import; it is not required in Vercel. Never run migrations through the
transaction pooler. URL-encode special characters in passwords. `ADMIN_PASSWORD` must be at least 10 characters;
`seed:admin` creates or updates that account with the `ADMIN` role and never prints the
password. Rotate it by editing `.env` and re-running the script. Never commit `.env`.

## Sabbath School widget

`/sabbath-school` reads the current week from Adventech and renders each day’s reading.
The same data is available to other pages through two cache-backed JSON routes:

| Route | Purpose |
| --- | --- |
| `/api/sabbath-school/current` | Current quarter, lesson, seven days and today’s day ID. Add `?quarter=2026-04&lesson=01` for any lesson. |
| `/api/sabbath-school/day?day=01` | Sanitised reading for one day (`01`–`07`). Add `quarter` and `lesson` for any lesson. |

For WordPress, Webflow or any custom HTML page, paste this where the widget should appear:

```html
<div id="rca-sabbath-widget"></div>
<script src="https://YOUR-SITE.example/embed/sabbath-school-widget.js" defer></script>
```

Replace `YOUR-SITE.example` with the deployed domain. The script auto-detects the API
origin from its own URL, renders inside a shadow root so host styles cannot leak in, and
contains its own light/dark responsive styling. Use `data-target="#my-container"` on the
script tag if you prefer a custom mount point.

Readings are requested from the official feed at viewing time. They are normalised and
sanitised by `lib/adventech.ts`, cached for 15 minutes, never written to the database,
and always shown with copyright attribution and an official guide link.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Webpack dev server on <http://localhost:3000>. |
| `npm run build` | Generate Prisma Client, then build the app. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (Next.js config). |
| `npm run db:deploy` | Apply committed PostgreSQL migrations using `DIRECT_URL`. |
| `npm run db:migrate` | Create/apply a development migration after schema changes. |
| `npm run db:setup` | Apply reviewed migrations only. |
| `npm run db:audit` | Compare actual database counts and verse keys with available source caches. |
| `npm run db:studio` | Open Prisma Studio against the configured database. |
| `npm run ingest:all` | All content importers in dependency order. |
| `npm run ingest:kinyarwanda` | Extract and import `bibiliya.pdf` as the `kin` translation. |
| `npm run ingest:kinyarwanda-hymns` | Extract and import the supplied 500 Kinyarwanda hymns. |
| `npm run verify:kinyarwanda` | Validate cached Kinyarwanda Bible extraction without database writes. |
| `npm run verify:kinyarwanda-hymns` | Re-parse supplied hymn PDFs and compare with the saved extraction without writing files. |
| `npm run seed:admin` | Create/update the administrator account. |

## Routes

| Route | Description |
| --- | --- |
| `/` | Home: daily verse, continue reading, current lesson, featured hymns. |
| `/bible`, `/bible/[translation]`, `/bible/[translation]/[book]/[chapter]` | Bible library, edition overview, reader. |
| `/hymnal`, `/hymnal/[collection]`, `/hymnal/[collection]/[number]` | Hymn collections and hymn pages. |
| `/sabbath-school`, `/sabbath-school/[quarter]`, `/sabbath-school/[quarter]/[lesson]` | Quarter, lesson list and live lesson reader. |
| `/plans`, `/plans/[slug]` | Reading plans and day-by-day tracker. |
| `/search` | Unified search across Scripture, hymns and lesson metadata. |
| `/library` | Personal saved items, notes, history and progress. |
| `/login`, `/register` | Optional accounts. |
| `/about` | Sources, licences and editorial policy. |
| `/admin` | Administrators only; 404 for members, redirect to sign-in for guests. |

API routes: `/api/search`, `/api/auth/register`, `/api/auth/login`,
`/api/auth/logout`, and `/api/library` (GET/PUT). Library mutations require a session,
same-origin requests and a validated payload; personal responses are `no-store`.

## Content policy

- No Bible verse, hymn stanza or lesson paragraph is generated by an LLM or translated
  into another language and presented as an official text.
- An edition or collection with no authorised text has `verificationStatus:
  "UNAVAILABLE"` and an `availabilityNote` explaining why. Pages render that note
  instead of placeholder content.
- Importers validate structure and record the source, licence and source URL in the
  database. Import and sync runs are written to `SyncLog` and shown to administrators.
- `PENDING` content with imported records remains browsable with a review notice; it is
  not a claim that the text or redistribution rights were independently verified.
- Sabbath School content permission is `LINK_ONLY`. Quarter, lesson, day labels, dates
  and official URLs are stored; lesson bodies are not.
- The official English hymnal is `isOfficialSda: true` but `UNAVAILABLE` until the
  rights holder supplies text. The supplied Kinyarwanda hymnal stays `PENDING` until
  its lyrics and rights are independently reviewed. Do not add
  lyrics from memory, another hymnal or a translation.

If you obtain permission for a text, add a new importer that preserves the rights
holder's attribution and licence, set the collection/translation to `VERIFIED`, and keep
the original source URL. Do not overwrite an unavailable record with unofficial text.

## Known limitations

- The supplied Kinyarwanda PDF is missing or damaged in eleven chapters: Ruth 4,
  Ezra 10, Job 21, Psalm 119, Romans 9, Hebrews 2, 2 Peter 2–3, and 1 John 1, 2 and 4.
  Those chapters are completed from the same text at bibiliya.com and disclosed on the
  edition page. No other Kinyarwanda edition has been mixed in.
- The PDF carries no licence statement. The project owner supplied it; redistribution
  rights must be confirmed before public deployment.
- Kinyarwanda verse numbering is not identical to the KJV (for example Psalm titles and
  the Joel/Malachi chapter split). The reader follows each translation's own chapters
  rather than forcing KJV numbering.
- The Kinyarwanda SDA hymnal was supplied as 560 single-page PDFs. Its text layer was
  reconstructed into 500 numbered hymns and 2,142 stanzas; all numbers 1–500 are
  present. A fresh parse matches the saved extraction, but that does not prove each lyric
  was transcribed correctly. The PDFs carry no explicit licence statement, so
  redistribution rights must be confirmed before public deployment.
- The official English SDA Hymnal remains unavailable.

## Data and deployment

Supabase PostgreSQL is the database for development and production. Prisma keeps the
same models; `prisma/schema.prisma` targets PostgreSQL and uses two URLs:

- `DATABASE_URL` — Supabase Transaction pooler, port 6543, for Vercel runtime requests.
- `DIRECT_URL` — Supabase Session pooler, port 5432, for Prisma migrations.
- `INGEST_DATABASE_URL` — optional Session pooler URL for manually run, long transactions.
  The importer selects it when present; do not set it in Vercel.

### Supabase setup

1. Create a Supabase project and copy both connection strings from **Connect**.
2. Put them in `.env` locally or in the host’s secret manager for production.
   URL-encode special characters in the password. Do not commit `.env`.
3. Apply the committed migration:

   ```bash
   npm run db:deploy
   ```

4. Import content as a separate controlled operation and create the administrator:

   ```bash
   npm run ingest:all
   npm run seed:admin
   ```

5. Configure Vercel with `DATABASE_URL` and `DIRECT_URL`. Apply reviewed migrations
   before deploying code that depends on them. The build generates Prisma Client and
   builds the app; do not run content imports from Vercel builds. Set `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` only for a manual admin seed operation.

Run the app on a Node.js-capable host with outbound PostgreSQL access, such as a VPS,
Railway, Render or Vercel Node functions. Standard Prisma does not run on an edge-only
runtime; use Prisma Accelerate or a supported driver adapter if deploying to Workers.

`npm run db:setup` only deploys migrations. Content imports are separate manual commands;
they are not part of Vercel builds. Review migrations before deployment and run
`npm run db:audit` after imports.

The old `prisma/dev.db` SQLite file is no longer used by the application. Re-importing
content recreates the Bible, hymns, reading plans and quarter metadata. Existing local
accounts, sessions, bookmarks and notes are not copied automatically; migrate those
separately before decommissioning the SQLite file if you need them.

Keep `content/cache/` out of the public web root. Supabase provides the database backup
and point-in-time recovery controls for production.

Before exposing a public instance:

1. Set a strong `ADMIN_PASSWORD`, run `npm run seed:admin`, then rotate it if it was ever
   shared.
2. Review `/about` and the `Source` rows so licence text matches the content you
   imported.
3. Confirm the current quarter sync works from the deployment network.
4. Confirm Supabase backups and keep `content/cache/` out of the public web root.

## Project structure

```
app/                 routes (bible, hymnal, sabbath-school, plans, library, admin, api)
components/          UI: header/footer, readers, tools, auth, plans, library, admin
lib/                 data access, auth, search, library store, content helpers
prisma/              data model, PostgreSQL migrations and ignored local SQLite file
scripts/             importers, quarter sync, catalogue and admin seeds
content/cache/       downloaded source corpora and logs (gitignored)
```

## Attribution

- King James Version (1769) and World English Bible: public domain. WEB by Rainbow
  Missions, Inc. (ebible.org). Import mirror: `midvash/bible-data`.
- Kinyarwanda *Bibiliya Yera*: supplied PDF prepared by Grace Geeks (2015), also
  published at <https://abisezerano.com>. Eleven damaged or missing chapters completed
  from the same text at <https://bibiliya.com>. Rights status has not been independently
  verified.
- Hymn texts: public domain, sourced from Hymnary.org (Calvin University); each hymn
  links to its Hymnary.org entry. Corpus mirror: `OpenChristianData/open-christian-data`.
- Kinyarwanda SDA hymnal: the supplied 560-page PDF set of *Indirimbo zo Guhimbaza
  Imana*, published by the Rwanda Union Mission. 500 hymns and 2,142 stanzas are
  reproduced as printed. Rights have not been independently verified.
- Sabbath School metadata: official Adventech API used by the Adult Bible Study Guide,
  <https://absg.adventist.org>.
- Icons: [Lucide](https://lucide.dev), ISC licence.
- Seventh-day Adventist Church symbol: the official Adventist Identity Guideline
  System download at <https://www.adventist.design/downloads/logo>. It remains a
  registered trademark of the General Conference of Seventh-day Adventists. RCA SDA is
  an independent community project, not an official church website.
- Photography: [Unsplash](https://unsplash.com/license). Per-photographer credits are
  listed on `/about#photography`; the images are illustrative and do not depict RCA SDA
  events or members.
- Fonts: Inter, Source Serif 4 and Noto Sans via `next/font` (SIL Open Font License).
