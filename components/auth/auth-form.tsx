"use client";

import { Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const destination = next?.startsWith("/") ? next : "/library";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password },
        ),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("The connection failed. Check your network and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isRegister ? (
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="mt-1.5 h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink outline-none focus:border-rule-strong"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink outline-none focus:border-rule-strong"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 10 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink outline-none focus:border-rule-strong"
        />
        {isRegister ? (
          <p className="mt-1 text-xs text-muted">At least 10 characters.</p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-burgundy/30 bg-burgundy-tint px-3 py-2 text-sm text-burgundy"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary h-11 w-full disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : isRegister ? (
          <UserPlus className="size-4" aria-hidden />
        ) : (
          <LogIn className="size-4" aria-hidden />
        )}
        {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-burgundy hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="text-burgundy hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
