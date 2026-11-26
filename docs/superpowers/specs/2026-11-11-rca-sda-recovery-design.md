# RCA SDA Recovery and Production Readiness Design

Date: 2026-11-11

## Goal

Recover the existing RCA SDA application without replacing working features. Make its imports safe to retry, content status honest, database access suitable for local development and Vercel, and the application buildable for Vercel. Verify actual records and application behavior wherever the available credentials and source material permit.

## Constraints

- Preserve the existing application, local SQLite file, existing user data, and working features.
- Never reset or drop production data. Use reviewed Prisma migrations for schema changes.
- Never put credentials in source control, logs, or chat.
- Do not fabricate or silently repair Bible, hymn, or Sabbath School content.
- Keep copyrighted Sabbath School content link-only unless reproduction is authorized. Identify English hymn collections truthfully and keep unauthorized official SDA lyrics unavailable.
- Do not make builds run full content imports.
- Distinguish source-file validation from database record verification.
- This workspace currently has no Git metadata, so changes cannot be compared with a Git baseline or committed here.

## Current evidence

- The project uses Next.js 15, React 19, Prisma 6, and PostgreSQL configuration with pooled and direct URLs.
- There is one initial PostgreSQL migration and a schema containing Bible, hymn, Sabbath School, reading plan, account, preference, and sync-log models.
- The local KJV and WEB JSON sources contain 66 books, 1,189 chapters, and 31,102 / 31,098 verses. These counts do not establish database contents.
- The Bible importer has a duplicate nested loop. Kinyarwanda Bible metadata is marked complete before insertion, and existing verses are deleted outside a transaction.
- Hymn importers delete existing rows before replacing them. The generated Kinyarwanda hymnal JSON reports 500 hymns and 2,142 stanzas; this does not prove PDF accuracy or database import.
- Sabbath School sync retrieves quarter and lesson metadata and creates empty daily rows. It does not populate full lesson content. The 2026 Q4 listing was visible on the public Sabbath School site at inspection time.
- Content caches and source PDFs are ignored by Git. The Vercel build cannot depend on them being present.
- The build script does not explicitly run Prisma generation. A generated Cloudflare/OpenNext config is included by TypeScript despite Vercel being the deployment target.
- A Git status could not be obtained because this directory is not a Git repository. `.env` and `.env.local` exist and were not read.

## Design and workstreams

### 1. Database and import reliability

Keep the shared Prisma client singleton for request handling and configure deployment pooling through environment URLs appropriate to Supabase transaction pooling. Use the direct or session URL for migrations and long-running ingestion. Add explicit, documented connection and timeout expectations without embedding credentials.

Refactor imports to validate all source records before changing active data. Use bounded transactions or a staging-and-swap strategy, then verify actual counts and key coverage before setting `VERIFIED` / complete metadata. Preserve the last good active data on import failure. Log start, success, and failure context to `SyncLog`; allow safe retries and avoid excessive parallel queries. Remove the accidental duplicate English import loop.

For the 66-book English sources, validate every book identity and order, chapter sequence, verse identifier, text value, duplicate, and expected aggregate count. For Kinyarwanda sources, report parser failures, supplements, gaps, duplicates, and uncertain extraction explicitly; do not claim a full verified edition unless those checks support it. Apply the same replace-safely pattern to hymns and their stanzas.

### 2. Content synchronization and truthful availability

Keep Sabbath School synchronization metadata-first and linked to official lesson pages unless explicit reproduction rights are established. Validate official API responses and dates before writing. Upsert changed quarters and lessons without deleting valid records on network or validation failure. Represent days and Bible references only when actually supplied by the source. Record source URL and retrieval time. Support future quarter IDs and available languages without hard-coded current-quarter assumptions.

Keep the Kinyarwanda hymnal associated with its supplied source and rights status. Verify parsed output against available PDFs to the extent possible and clearly distinguish structural completeness from textual verification. Do not call content verified solely because a parser produced all expected numbers. Mark unauthorized English SDA hymnal lyrics unavailable; label any separate public-domain collection accurately.

### 3. Application, security, and performance audit

Trace existing routes and pages through the schema and actual query patterns. Preserve current navigation and user-specific features. Fix defects in Bible chapter retrieval, hymn browse/search/detail, Sabbath School quarter/lesson navigation, empty states, and error handling. Add pagination or bounded search results where needed. Add indexes only when query patterns and migration safety justify them. Never cache authenticated or user-specific responses publicly.

Review authentication and each mutation route for session checks, role checks, validation, same-origin handling, safe errors, and secret exposure. Preserve bcrypt password hashing and HTTP-only session cookies; address any concrete gaps found in the route audit.

### 4. Vercel and reproducible operations

Make Vercel the unambiguous production target. Ensure the build generates Prisma Client and runs `next build`, without Cloudflare commands or local cache/PDF dependencies. Remove or isolate Cloudflare-only generated config and dependencies only where the project no longer needs them. Keep migration deployment and ingestion as explicit operations separate from builds. Expand `.env.example` with placeholders only and retain ignore rules for secrets, databases, and temporary artifacts.

Document the runtime pooled URL, direct/session migration URL, and optional admin/source credentials by variable name and purpose. Never print or commit values. Require migration review and deployment before application code relies on a changed schema.

## Verification

Run the requested Prisma validation/generation, typecheck, lint, build, and source-level import validations. When a production or staging database is configured, test connectivity before imports, deploy migrations safely, run controlled imports, and query actual database counts, uniqueness, missing identifiers, foreign keys, and completeness flags. Do not report database or browser checks as passing unless actually executed. Test key Bible, hymnal, Sabbath School, account, and navigation flows against the running app when a usable environment is available.

Produce an audit table separating source expectations from actual database records, with explicit unavailable or unverified statuses. Include exact deployment variables and steps, completed work, blockers, and remaining limitations.

## Delivery boundaries

The recovery is performed in manageable workstreams: (1) repository and environment baseline, (2) Prisma and safe importers, (3) source and content verification/synchronization, (4) application/security/performance audit, and (5) Vercel configuration and end-to-end verification. Production imports and production migrations require an available configured database and a preflight check; no production reset or destructive schema operation is allowed.

## Self-review

- No placeholder content or invented text is part of the design.
- Source-file counts, parser completeness, and database counts are explicitly distinct.
- The database strategy preserves active records on a failed import and does not rely on a destructive reset.
- The deployment target is Vercel; Cloudflare components are conditional on proven application use.
- Production verification is conditional on safe database access and is not represented as completed in advance.
