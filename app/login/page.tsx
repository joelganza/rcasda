import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/library");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <p className="text-[0.7rem] font-medium tracking-[0.1em] text-burgundy uppercase">
        Member sign-in
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-tight text-ink">
        Keep your place
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Keep your bookmarks, notes and reading progress across devices.
      </p>

      <div className="mt-6 card border-rule bg-paper p-5 sm:p-6">
        <AuthForm mode="login" next={next} />
      </div>
    </div>
  );
}
