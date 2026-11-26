"use client";

import { Check, Copy, Heart, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { useLibrary } from "@/lib/library";

type ToolItem = {
  number: number;
  title: string;
  subtitle: string;
  href: string;
  collectionName: string;
};

function itemKey(collectionId: string, number: number) {
  return `hymn:${collectionId}:${number}`;
}

export function HymnToolbar({
  collectionId,
  number,
  title,
  subtitle,
  href,
  collectionName,
  text,
}: ToolItem & { collectionId: string; text: string }) {
  const { recordHistory, isSaved, toggleSaved } = useLibrary();
  const key = `favorite:${itemKey(collectionId, number)}`;
  const favorite = isSaved(key);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    recordHistory({
      clientId: itemKey(collectionId, number),
      kind: "hymn",
      title,
      subtitle,
      href,
    });
  }, [collectionId, href, number, recordHistory, subtitle, title]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${title}\n${collectionName}\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() =>
          toggleSaved(key, {
            type: "favorite",
            kind: "hymn",
            title,
            subtitle,
            href,
          })
        }
        aria-pressed={favorite}
        className={`btn btn-secondary btn-sm ${
          favorite
            ? "border-burgundy bg-burgundy-tint text-burgundy"
            : ""
        }`}
      >
        <Heart className="size-4" aria-hidden fill={favorite ? "currentColor" : "none"} />
        {favorite ? "Saved to favourites" : "Save hymn"}
      </button>
      <button
        type="button"
        onClick={copy}
        className="btn btn-secondary btn-sm"
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy hymn"}
      </button>
    </div>
  );
}

export function HymnFavorite({
  collectionId,
  number,
  title,
  subtitle,
  href,
}: ToolItem & { collectionId: string }) {
  const { isSaved, toggleSaved } = useLibrary();
  const key = `favorite:${itemKey(collectionId, number)}`;
  const favorite = isSaved(key);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(key, {
          type: "favorite",
          kind: "hymn",
          title,
          subtitle,
          href,
        });
      }}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${title} from favourites` : `Save ${title} to favourites`}
      className={`flex size-8 items-center justify-center rounded-full transition-colors ${
        favorite
          ? "text-burgundy"
          : "text-muted hover:bg-surface hover:text-burgundy"
      }`}
    >
      <Star className="size-4" aria-hidden fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}
