"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { syncQuarterAction, type SyncActionResult } from "@/app/admin/actions";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncActionResult | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            setResult(await syncQuarterAction());
          });
        }}
        className="btn btn-primary btn-sm disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        {pending ? "Syncing…" : "Sync current quarter"}
      </button>
      {result ? (
        <p
          role="status"
          className={`mt-2 text-xs ${result.ok ? "text-emerald-700" : "text-burgundy"}`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
