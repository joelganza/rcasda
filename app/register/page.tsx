import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({
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
        Optional account
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-tight text-ink">
        Create your library
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Save favourite verses and hymns, keep personal notes, and continue your Sabbath
        School lesson on any device.
      </p>

      <div className="mt-6 card border-rule bg-paper p-5 sm:p-6">
        <AuthForm mode="register" next={next} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Your email and saved items stay private to your account.
      </p>
    </div>
  );
}
