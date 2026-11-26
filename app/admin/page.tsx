import { CalendarClock, Database, ExternalLink, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { deleteUserSessionsAction, updateRoleAction } from "@/app/admin/actions";
import { SyncButton } from "@/components/admin/sync-button";
import { PageHeader } from "@/components/page-header";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeDb } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const unavailable = { unavailable: true } as const;
  const sessionResult = await safeDb(getSessionUser, unavailable);
  if (sessionResult === unavailable) return <Unavailable />;
  const session = sessionResult as Awaited<ReturnType<typeof getSessionUser>>;
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "ADMIN") notFound();

  const [
    users,
    verseCount,
    hymnCount,
    hymnCollectionCount,
    quarter,
    lessonCount,
    syncLogs,
    sources,
  ] = await Promise.all([
    safeDb(() => db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { sessions: true, savedItems: true } },
      },
    }), unavailable),
    safeDb(() => db.verse.count(), unavailable),
    safeDb(() => db.hymn.count(), unavailable),
    safeDb(() => db.hymnCollection.count(), unavailable),
    safeDb(() => db.quarter.findFirst({ orderBy: [{ year: "desc" }, { quarter: "desc" }] }), unavailable),
    safeDb(() => db.lesson.count(), unavailable),
    safeDb(() => db.syncLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }), unavailable),
    safeDb(() => db.source.findMany({ orderBy: { title: "asc" } }), unavailable),
  ]);
  if ([users, verseCount, hymnCount, hymnCollectionCount, quarter, lessonCount, syncLogs, sources].includes(unavailable)) return <Unavailable />;
  const currentQuarter = quarter as Awaited<ReturnType<typeof db.quarter.findFirst>>;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Platform status"
        description="Moderation and source health for RCA SDA. Only administrators can reach this page."
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Database} label="Bible verses" value={verseCount.toLocaleString("en-GB")} />
          <Stat
            icon={Database}
            label="Hymns"
            value={hymnCount.toLocaleString("en-GB")}
            detail={`${hymnCollectionCount} collections`}
          />
          <Stat icon={CalendarClock} label="Lessons" value={String(lessonCount)} detail={currentQuarter?.title} />
          <Stat icon={Users} label="Members" value={String((users as unknown as { id: string }[]).length)} />
        </section>

        <section className="card border-rule bg-paper p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg text-ink">
                <ShieldCheck className="size-4 text-burgundy" aria-hidden />
                Sabbath School source
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                Metadata is pulled from the official Adventech API used by
                absg.adventist.org. Lesson text is never stored — each lesson links to the
                official guide.
              </p>
              {currentQuarter ? (
                <p className="mt-2 text-sm text-ink-soft">
                  Current: <span className="font-medium text-ink">{currentQuarter.title}</span> ·{" "}
                  {currentQuarter.id} ·{" "}
                  <a
                    href={currentQuarter.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-burgundy hover:underline"
                  >
                    Official site <ExternalLink className="size-3" aria-hidden />
                  </a>
                </p>
              ) : null}
            </div>
            <SyncButton />
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink">Members</h2>
          <p className="mt-1 text-sm text-muted">
            Promote a trusted member to administrator, or revoke their sessions if their
            account was compromised. You cannot change your own role here.
          </p>
          <div className="mt-3 overflow-x-auto card border-rule bg-paper">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-rule bg-surface/60 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Member</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Joined</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Saved</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {(users as unknown as { id: string; email: string; name: string | null; role: string; createdAt: Date; _count: { sessions: number; savedItems: number } }[]).map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="text-ink">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {user.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted">
                      {user._count.savedItems}
                    </td>
                    <td className="px-4 py-3">
                      {user.id === session.id ? (
                        <span className="rounded-full bg-burgundy-tint px-2 py-1 text-xs text-burgundy">
                          You · {user.role}
                        </span>
                      ) : (
                        <form action={updateRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <label htmlFor={`role-${user.id}`} className="sr-only">
                            Role for {user.email}
                          </label>
                          <select
                            id={`role-${user.id}`}
                            name="role"
                            defaultValue={user.role}
                            className="h-8 rounded-md border border-rule bg-paper px-2 text-xs text-ink"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Administrator</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-rule px-2 py-1 text-xs text-ink-soft hover:border-rule-strong hover:text-ink"
                          >
                            Save
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted">
                          {user._count.sessions}
                        </span>
                        {user.id === session.id ? null : (
                          <form action={deleteUserSessionsAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <button
                              type="submit"
                              className="text-xs text-muted hover:text-burgundy"
                            >
                              Revoke
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-xl text-ink">Sources</h2>
            <ul className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
              {(sources as unknown as { id: string; title: string; organization: string; license: string; verificationStatus: string; sourceUrl: string | null }[]).map((source) => (
                <li key={source.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-ink">{source.title}</p>
                    <span className="shrink-0 text-[0.65rem] tracking-wide text-muted uppercase">
                      {source.verificationStatus.replace("_", " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {source.organization} · {source.license}
                  </p>
                  {source.permissionNotes ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {source.permissionNotes}
                    </p>
                  ) : null}
                  {source.sourceUrl ? (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-burgundy hover:underline"
                    >
                      {source.sourceUrl}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-xl text-ink">Recent syncs</h2>
            {(syncLogs as unknown as { id: string }[]).length === 0 ? (
              <p className="mt-3 text-sm text-muted">No syncs recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-rule overflow-hidden card border-rule bg-paper">
                {(syncLogs as unknown as { id: string }[]).map((log) => (
                  <li key={log.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-ink">{log.kind}</p>
                      <span
                        className={`text-[0.65rem] tracking-wide uppercase ${
                          log.status === "SUCCESS" ? "text-emerald-700" : "text-burgundy"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{log.message}</p>
                    <p className="mt-1 text-[0.68rem] text-muted">
                      {log.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">
              Data can also be refreshed from the command line with{" "}
              <code className="rounded bg-surface px-1.5 py-0.5">npm run ingest:all</code>,
              or just the quarter with{" "}
              <code className="rounded bg-surface px-1.5 py-0.5">npm run ingest:quarter</code>.
            </p>
          </div>
        </section>

        <p className="text-xs text-muted">
          <Link href="/" className="text-burgundy hover:underline">
            Back to the library
          </Link>
        </p>
      </div>
    </div>
  );
}

function Unavailable() { return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-ink-soft">Administration data is temporarily unavailable. Please try again shortly.</div>; }

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <div className="card border-rule bg-paper p-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-burgundy-tint text-burgundy">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-2 text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="font-serif text-2xl text-ink">{value}</p>
      {detail ? <p className="truncate text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
